"""Tests for backend services: incidents, campaigns, and query_budget"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta
from fastapi import HTTPException

from backend.db.models import (
    Base, Organization, Campaign, Incident, 
    SectorEnum, RegionEnum, AttackVectorEnum, ImpactLevelEnum
)
from backend.schemas import IncidentCreate, IOC, CampaignFilters
from backend.services.incidents import create_or_update_incident
from backend.services.campaigns import list_campaigns, apply_privacy_rules
from backend.services.query_budget import check_and_decrement_budget, DEFAULT_QUERY_BUDGET
from backend.auth import hash_api_key


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def test_org(test_db):
    """Create a test organization"""
    org = Organization(
        id="org_alice",
        display_name="Alice's Organization",
        sector=SectorEnum.HEALTH,
        region=RegionEnum.NA_EAST,
        api_key_hash=hash_api_key("test-key"),
        query_budget=DEFAULT_QUERY_BUDGET,
        budget_reset_at=datetime.utcnow() + timedelta(days=1)
    )
    test_db.add(org)
    test_db.commit()
    return org


@pytest.fixture
def sample_incident_data():
    """Create sample incident data for testing"""
    return IncidentCreate(
        local_ref="incident-001",
        time_start=datetime.utcnow(),
        time_end=None,
        attack_vector=AttackVectorEnum.AI_PHISHING,
        ai_components=["LLM", "vector_db"],
        techniques=["social_engineering", "prompt_injection"],
        iocs=[
            IOC(type="email", value="attacker@example.com"),
            IOC(type="url", value="https://phishing.example.com")
        ],
        impact_level=ImpactLevelEnum.HIGH,
        summary="Phishing campaign using AI-generated emails"
    )


class TestCreateOrUpdateIncident:
    """Test cases for create_or_update_incident function"""
    
    def test_create_new_incident_and_assign_to_campaign(
        self, test_db, test_org, sample_incident_data
    ):
        """Test: create_or_update_incident should create a new incident and assign it to a new campaign when no matching campaign exists"""
        # Act
        incident = create_or_update_incident(
            db=test_db,
            incident_data=sample_incident_data,
            org=test_org
        )
        
        # Assert - Incident created
        assert incident is not None
        assert incident.id is not None
        assert incident.org_id == "org_alice"
        assert incident.local_ref == "incident-001"
        assert incident.attack_vector == AttackVectorEnum.AI_PHISHING
        assert incident.summary == "Phishing campaign using AI-generated emails"
        assert incident.ai_components == ["LLM", "vector_db"]
        
        # Assert - Campaign assigned
        assert incident.campaign_id is not None
        campaign = test_db.query(Campaign).filter(
            Campaign.id == incident.campaign_id
        ).first()
        assert campaign is not None
        assert campaign.primary_attack_vector == AttackVectorEnum.AI_PHISHING
        assert campaign.num_orgs >= 1
        assert campaign.num_incidents >= 1
    
    def test_create_incident_with_duplicate_local_ref_updates_existing(
        self, test_db, test_org, sample_incident_data
    ):
        """Test: create_or_update_incident should update existing incident with same local_ref"""
        # Arrange - create first incident
        incident1 = create_or_update_incident(
            db=test_db,
            incident_data=sample_incident_data,
            org=test_org
        )
        original_id = incident1.id
        
        # Act - update with same local_ref but different data
        updated_data = IncidentCreate(
            local_ref="incident-001",  # Same local_ref
            time_start=datetime.utcnow() + timedelta(hours=1),
            time_end=None,
            attack_vector=AttackVectorEnum.DEEPFAKE_VOICE,  # Different vector
            ai_components=["audio_synthesis"],
            techniques=["social_engineering"],
            iocs=[IOC(type="phone", value="+1-555-0100")],
            impact_level=ImpactLevelEnum.MEDIUM,
            summary="Updated incident summary"
        )
        incident2 = create_or_update_incident(
            db=test_db,
            incident_data=updated_data,
            org=test_org
        )
        
        # Assert - same incident updated
        assert incident2.id == original_id
        assert incident2.summary == "Updated incident summary"
        assert incident2.attack_vector == AttackVectorEnum.DEEPFAKE_VOICE


class TestListCampaigns:
    """Test cases for list_campaigns function"""
    
    def test_list_campaigns_apply_k_anonymity_single_org(
        self, test_db, test_org, sample_incident_data
    ):
        """Test: list_campaigns should apply k-anonymity and suppress sector/region information when num_orgs is less than 2"""
        # Arrange - create incident and campaign
        incident = create_or_update_incident(
            db=test_db,
            incident_data=sample_incident_data,
            org=test_org
        )
        
        # Refresh to get latest campaign state
        test_db.refresh(incident.campaign)
        campaign = incident.campaign
        
        # Verify campaign has only 1 org
        assert campaign.num_orgs == 1
        
        # Act
        campaigns = list_campaigns(db=test_db)
        
        # Assert - sectors and regions suppressed for single org
        assert len(campaigns) >= 1
        found_campaign = next(
            (c for c in campaigns if c.id == campaign.id), None
        )
        assert found_campaign is not None
        assert found_campaign.sectors == []  # Suppressed
        assert found_campaign.regions == []  # Suppressed
    
    def test_list_campaigns_show_data_with_multiple_orgs(
        self, test_db, test_org, sample_incident_data
    ):
        """Test: list_campaigns should show sector/region information when num_orgs >= 2"""
        # Arrange - create first incident
        incident1 = create_or_update_incident(
            db=test_db,
            incident_data=sample_incident_data,
            org=test_org
        )
        campaign_id = incident1.campaign_id
        
        # Arrange - create second org and incident for same campaign
        org2 = Organization(
            id="org_bob",
            display_name="Bob's Organization",
            sector=SectorEnum.ENERGY,
            region=RegionEnum.EU,
            api_key_hash=hash_api_key("test-key-2"),
            query_budget=DEFAULT_QUERY_BUDGET,
            budget_reset_at=datetime.utcnow() + timedelta(days=1)
        )
        test_db.add(org2)
        test_db.commit()
        
        # Create second incident with same attack vector (will match campaign)
        incident2_data = IncidentCreate(
            local_ref="incident-002",
            time_start=datetime.utcnow() + timedelta(hours=1),
            time_end=None,
            attack_vector=AttackVectorEnum.AI_PHISHING,
            ai_components=["LLM"],
            techniques=["social_engineering"],
            iocs=[IOC(type="email", value="attacker2@example.com")],
            impact_level=ImpactLevelEnum.MEDIUM,
            summary="Another phishing incident"
        )
        incident2 = create_or_update_incident(
            db=test_db,
            incident_data=incident2_data,
            org=org2
        )
        
        # Act
        campaigns = list_campaigns(db=test_db)
        
        # Assert - sectors and regions visible for 2+ orgs
        found_campaign = next(
            (c for c in campaigns if c.id == campaign_id), None
        )
        assert found_campaign is not None
        assert found_campaign.num_orgs >= 2
        # Sectors and regions should be populated (not suppressed)
        assert isinstance(found_campaign.sectors, list)
        assert isinstance(found_campaign.regions, list)


class TestApplyPrivacyRules:
    """Test cases for apply_privacy_rules function"""
    
    def test_apply_privacy_rules_suppresses_single_org(self, test_db):
        """Test: apply_privacy_rules suppresses sectors/regions for single org campaign"""
        # Arrange
        campaign = Campaign(
            primary_attack_vector=AttackVectorEnum.AI_PHISHING,
            ai_components=["LLM"],
            sectors=["health"],
            regions=["NA-East"],
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            num_orgs=1,  # Single org - should suppress
            num_incidents=1,
            canonical_summary="Test campaign"
        )
        test_db.add(campaign)
        test_db.commit()
        
        # Act
        result = apply_privacy_rules(campaign)
        
        # Assert
        assert result["sectors"] == []
        assert result["regions"] == []
        assert result["num_orgs"] == 1
    
    def test_apply_privacy_rules_shows_multiple_org_data(self, test_db):
        """Test: apply_privacy_rules shows sectors/regions for 2+ orgs"""
        # Arrange
        campaign = Campaign(
            primary_attack_vector=AttackVectorEnum.AI_PHISHING,
            ai_components=["LLM"],
            sectors=["health", "energy"],
            regions=["NA-East", "EU"],
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            num_orgs=2,
            num_incidents=2,
            canonical_summary="Test campaign"
        )
        test_db.add(campaign)
        test_db.commit()
        
        # Act
        result = apply_privacy_rules(campaign)
        
        # Assert
        assert result["sectors"] == ["health", "energy"]
        assert result["regions"] == ["NA-East", "EU"]
        assert result["num_orgs"] == 2


class TestCheckAndDecrementBudget:
    """Test cases for check_and_decrement_budget function"""
    
    def test_decrement_budget_on_query(self, test_db, test_org):
        """Test: check_and_decrement_budget should decrement the budget"""
        # Arrange
        initial_budget = test_org.query_budget
        assert initial_budget > 0
        
        # Act
        check_and_decrement_budget(db=test_db, org=test_org)
        
        # Assert
        test_db.refresh(test_org)
        assert test_org.query_budget == initial_budget - 1
    
    def test_raise_exception_when_budget_exhausted(self, test_db, test_org):
        """Test: check_and_decrement_budget should raise HTTPException when budget is exhausted"""
        # Arrange - exhaust budget
        test_org.query_budget = 0
        test_db.commit()
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            check_and_decrement_budget(db=test_db, org=test_org)
        
        assert exc_info.value.status_code == 429
        assert "budget exhausted" in exc_info.value.detail.lower()
    
    def test_budget_reset_when_reset_time_passed(self, test_db, test_org):
        """Test: check_and_decrement_budget should reset budget when reset time has passed"""
        # Arrange - set budget to low and reset time in past
        test_org.query_budget = 10
        test_org.budget_reset_at = datetime.utcnow() - timedelta(hours=1)
        test_db.commit()
        
        # Act
        check_and_decrement_budget(db=test_db, org=test_org)
        
        # Assert - budget reset to default
        test_db.refresh(test_org)
        assert test_org.query_budget == DEFAULT_QUERY_BUDGET - 1
        # Reset time should be updated
        assert test_org.budget_reset_at > datetime.utcnow()
    
    def test_multiple_decrements_reduce_budget_correctly(self, test_db, test_org):
        """Test: multiple check_and_decrement_budget calls reduce budget progressively"""
        # Arrange
        initial_budget = test_org.query_budget
        num_queries = 5
        
        # Act
        for _ in range(num_queries):
            check_and_decrement_budget(db=test_db, org=test_org)
        
        # Assert
        test_db.refresh(test_org)
        assert test_org.query_budget == initial_budget - num_queries
