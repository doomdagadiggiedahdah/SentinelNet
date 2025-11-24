from sqlalchemy import (
    Column, String, Integer, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class SectorEnum(str, enum.Enum):
    HEALTH = "health"
    ENERGY = "energy"
    WATER = "water"
    GOV = "gov"
    FINANCE = "finance"
    OTHER = "other"


class RegionEnum(str, enum.Enum):
    NA_EAST = "NA-East"
    NA_WEST = "NA-West"
    EU = "EU"
    APAC = "APAC"


class AttackVectorEnum(str, enum.Enum):
    AI_PHISHING = "ai_phishing"
    DEEPFAKE_VOICE = "deepfake_voice"
    LLM_PROMPT_INJECTION = "llm_prompt_injection"
    AI_MALWARE_DEV = "ai_malware_dev"
    AI_LATERAL_MOVEMENT = "ai_lateral_movement"
    OTHER = "other"


class ImpactLevelEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True)  # e.g., "org_alice"
    display_name = Column(String, nullable=False)
    sector = Column(SQLEnum(SectorEnum), nullable=False)
    region = Column(SQLEnum(RegionEnum), nullable=False)
    api_key_hash = Column(String, nullable=False, unique=True)
    query_budget = Column(Integer, nullable=False, default=100)
    budget_reset_at = Column(DateTime, nullable=False)
    # Profile fields for predictive risk assessment
    org_size = Column(String, nullable=True)  # e.g., "500-1000"
    primary_systems = Column(JSON, nullable=True, default=list)  # array of systems
    ai_systems_in_use = Column(JSON, nullable=True, default=list)  # array of AI tools
    mfa_enabled = Column(String, nullable=True)  # "all_users" | "admins_only" | "none"
    siem_platform = Column(String, nullable=True)  # e.g., "splunk", "elastic", "none"
    security_training_frequency = Column(String, nullable=True)  # e.g., "monthly", "quarterly", "none"
    phishing_simulations = Column(String, nullable=True)  # "regular" | "occasional" | "never"
    incident_response_plan = Column(String, nullable=True)  # "tested" | "documented" | "none"
    profile_completed_at = Column(DateTime, nullable=True)

    incidents = relationship("Incident", back_populates="organization")
    risk_assessments = relationship("RiskAssessment", back_populates="organization")
    threat_research_reports = relationship("ThreatResearchReport", back_populates="organization")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    primary_attack_vector = Column(SQLEnum(AttackVectorEnum), nullable=False)
    ai_components = Column(JSON, nullable=False, default=list)  # array of strings
    sectors = Column(JSON, nullable=False, default=list)  # array of strings
    regions = Column(JSON, nullable=False, default=list)  # array of strings
    first_seen = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, nullable=False)
    num_orgs = Column(Integer, nullable=False, default=0)
    num_incidents = Column(Integer, nullable=False, default=0)
    canonical_summary = Column(Text, nullable=True)

    incidents = relationship("Incident", back_populates="campaign")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    local_ref = Column(String, nullable=False)  # unique per org
    time_start = Column(DateTime, nullable=False)
    time_end = Column(DateTime, nullable=True)
    attack_vector = Column(SQLEnum(AttackVectorEnum), nullable=False)
    ai_components = Column(JSON, nullable=False, default=list)  # array of strings
    techniques = Column(JSON, nullable=False, default=list)  # array of strings
    iocs = Column(JSON, nullable=False, default=list)  # array of {type, value} objects
    impact_level = Column(SQLEnum(ImpactLevelEnum), nullable=False)
    summary = Column(Text, nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="incidents")
    campaign = relationship("Campaign", back_populates="incidents")

    __table_args__ = (
        # Unique constraint on (org_id, local_ref)
        UniqueConstraint("org_id", "local_ref", name="uq_org_local_ref"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String, nullable=False)
    action = Column(String, nullable=False)  # submit_incident, list_campaigns, etc.
    details = Column(JSON, nullable=True)  # filters, IDs, etc.
    result_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    assessed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    relevant_incidents_count = Column(Integer, nullable=False, default=0)
    high_risk_threats = Column(JSON, nullable=False, default=list)
    medium_risk_threats = Column(JSON, nullable=False, default=list)
    low_risk_threats = Column(JSON, nullable=False, default=list)
    valid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="risk_assessments")


class PreventivePlaybook(Base):
    __tablename__ = "preventive_playbooks"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    threat_id = Column(String, nullable=False)
    attack_vector = Column(String, nullable=False)
    playbook_sections = Column(JSON, nullable=False, default=dict)
    full_text = Column(Text, nullable=True)
    playbook_metadata = Column(JSON, nullable=True)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    organization = relationship("Organization")


class ThreatResearchReport(Base):
    __tablename__ = "threat_research_reports"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    org_description = Column(Text, nullable=False)
    org_description_hash = Column(String, nullable=False, index=True)
    extracted_profile = Column(JSON, nullable=True)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    search_queries = Column(JSON, nullable=True)
    sources_analyzed = Column(Integer, nullable=True)
    vulnerabilities = Column(JSON, nullable=False, default=list)
    executive_summary = Column(JSON, nullable=True)
    cached_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="threat_research_reports")
