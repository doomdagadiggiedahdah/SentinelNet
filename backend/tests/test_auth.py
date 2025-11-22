"""Tests for backend/auth.py"""
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta

from backend.auth import get_current_org, hash_api_key, verify_api_key
from backend.db.models import Base, Organization, SectorEnum, RegionEnum
from fastapi.security import HTTPAuthorizationCredentials


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
    """Create a test organization with a valid API key"""
    test_api_key = "test-api-key-12345"
    hashed_key = hash_api_key(test_api_key)
    
    org = Organization(
        id="org_test",
        display_name="Test Organization",
        sector=SectorEnum.HEALTH,
        region=RegionEnum.NA_EAST,
        api_key_hash=hashed_key,
        query_budget=100,
        budget_reset_at=datetime.utcnow() + timedelta(days=1)
    )
    test_db.add(org)
    test_db.commit()
    
    return {"org": org, "api_key": test_api_key}


class TestGetCurrentOrg:
    """Test cases for get_current_org authentication function"""
    
    @pytest.mark.asyncio
    async def test_get_current_org_valid_api_key(self, test_db, test_org):
        """Test: get_current_org should successfully authenticate with a valid API key"""
        # Arrange
        valid_api_key = test_org["api_key"]
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=valid_api_key
        )
        
        # Act
        org = await get_current_org(credentials=credentials, db=test_db)
        
        # Assert
        assert org is not None
        assert org.id == "org_test"
        assert org.display_name == "Test Organization"
        assert org.sector == SectorEnum.HEALTH
        assert org.region == RegionEnum.NA_EAST
    
    @pytest.mark.asyncio
    async def test_get_current_org_invalid_api_key(self, test_db, test_org):
        """Test: get_current_org should raise HTTPException for an invalid API key"""
        # Arrange
        invalid_api_key = "invalid-api-key-wrong"
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=invalid_api_key
        )
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_org(credentials=credentials, db=test_db)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid API key"
        assert "WWW-Authenticate" in exc_info.value.headers
        assert exc_info.value.headers["WWW-Authenticate"] == "Bearer"
    
    @pytest.mark.asyncio
    async def test_get_current_org_with_multiple_orgs(self, test_db, test_org):
        """Test: get_current_org correctly identifies the right org among multiple orgs"""
        # Arrange - add second org
        test_api_key_2 = "test-api-key-67890"
        hashed_key_2 = hash_api_key(test_api_key_2)
        
        org2 = Organization(
            id="org_test_2",
            display_name="Second Test Organization",
            sector=SectorEnum.ENERGY,
            region=RegionEnum.EU,
            api_key_hash=hashed_key_2,
            query_budget=50,
            budget_reset_at=datetime.utcnow() + timedelta(days=1)
        )
        test_db.add(org2)
        test_db.commit()
        
        # Use second org's API key
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=test_api_key_2
        )
        
        # Act
        org = await get_current_org(credentials=credentials, db=test_db)
        
        # Assert
        assert org.id == "org_test_2"
        assert org.display_name == "Second Test Organization"
        assert org.sector == SectorEnum.ENERGY


class TestApiKeyUtilities:
    """Test cases for API key hashing and verification utilities"""
    
    def test_hash_and_verify_api_key(self):
        """Test: hash_api_key and verify_api_key work correctly"""
        # Arrange
        plain_key = "my-secret-api-key"
        
        # Act
        hashed = hash_api_key(plain_key)
        is_valid = verify_api_key(plain_key, hashed)
        
        # Assert
        assert is_valid is True
        assert hashed != plain_key  # Hash should be different from plain text
    
    def test_verify_api_key_invalid(self):
        """Test: verify_api_key returns False for mismatched keys"""
        # Arrange
        plain_key = "correct-key"
        wrong_key = "wrong-key"
        hashed = hash_api_key(plain_key)
        
        # Act
        is_valid = verify_api_key(wrong_key, hashed)
        
        # Assert
        assert is_valid is False
