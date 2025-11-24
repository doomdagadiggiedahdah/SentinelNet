import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useOrg } from '../context/OrgContext';

interface ProfileData {
  org_size?: string;
  primary_systems?: string[];
  ai_systems_in_use?: string[];
  mfa_enabled?: string;
  siem_platform?: string;
  security_training_frequency?: string;
  phishing_simulations?: string;
  incident_response_plan?: string;
}

interface ThreatCard {
  threat_id: string;
  threat_name: string;
  attack_vector: string;
  evidence: Record<string, any>;
  exposure: Record<string, any>;
  likelihood: string;
  likelihood_percentage: number;
  estimated_impact: Record<string, number>;
  reasoning: string;
  risk_score: number;
}

interface RiskAssessment {
  assessed_at: string;
  org_id: string;
  relevant_incidents_count: number;
  high_risk: ThreatCard[];
  medium_risk: ThreatCard[];
  low_risk: ThreatCard[];
}

export function RiskAssessment() {
  const { orgId } = useOrg();
  
  const [selectedThreat, setSelectedThreat] = useState<ThreatCard | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({});

  // Fetch risk assessment
  const {
    data: assessment,
    isLoading,
    error,
    refetch,
  } = useQuery<RiskAssessment>({
    queryKey: ['risk-assessment', orgId],
    queryFn: async () => {
      const res = await apiClient.get<RiskAssessment>('/risk-assessment/');
      return res;
    },
    retry: false,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const res = await apiClient.post<RiskAssessment>('/risk-assessment/profile', data);
      return res;
    },
    onSuccess: () => {
      setProfileData({});
      refetch();
    },
  });

  // Generate playbook mutation
  const generatePlaybookMutation = useMutation({
    mutationFn: async (threat: ThreatCard) => {
      const res = await apiClient.post<any>('/risk-assessment/playbook', {
        threat_id: threat.threat_id,
        attack_vector: threat.attack_vector,
      });
      return res;
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePlaybookClick = (threat: ThreatCard) => {
    setSelectedThreat(threat);
    generatePlaybookMutation.mutate(threat);
  };

  if (error && (error as any).response?.status === 400) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>🎯 Risk Assessment</h1>
        <div style={warningStyle}>
          <p>Please complete your organization profile first to generate a risk assessment.</p>
        </div>

        <div style={formContainerStyle}>
          <h2>Organization Profile</h2>
          <form onSubmit={handleProfileSubmit}>
            <div style={formGroupStyle}>
              <label>Organization Size:</label>
              <select
                value={profileData.org_size || ''}
                onChange={(e) => setProfileData({ ...profileData, org_size: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="1-100">1-100 employees</option>
                <option value="100-500">100-500 employees</option>
                <option value="500-1000">500-1000 employees</option>
                <option value="1000-5000">1000-5000 employees</option>
                <option value="5000+">5000+ employees</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label>Primary Systems (comma-separated):</label>
              <input
                type="text"
                placeholder="e.g., Okta SSO, Office 365, AWS"
                value={(profileData.primary_systems || []).join(', ')}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    primary_systems: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
              />
            </div>

            <div style={formGroupStyle}>
              <label>AI Systems in Use (comma-separated):</label>
              <input
                type="text"
                placeholder="e.g., ChatGPT, GitHub Copilot"
                value={(profileData.ai_systems_in_use || []).join(', ')}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    ai_systems_in_use: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
              />
            </div>

            <div style={formGroupStyle}>
              <label>MFA Enabled:</label>
              <select
                value={profileData.mfa_enabled || ''}
                onChange={(e) => setProfileData({ ...profileData, mfa_enabled: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="all_users">All users</option>
                <option value="admins_only">Admins only</option>
                <option value="none">None</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label>SIEM Platform:</label>
              <input
                type="text"
                placeholder="e.g., Splunk, Elastic, None"
                value={profileData.siem_platform || ''}
                onChange={(e) => setProfileData({ ...profileData, siem_platform: e.target.value })}
              />
            </div>

            <button type="submit" style={buttonStyle} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile & Generate Assessment'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading risk assessment...</div>;
  }

  if (!assessment) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>No assessment available</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>🎯 Your Risk Assessment</h1>
        <button
          onClick={() => refetch()}
          style={{ ...buttonStyle, backgroundColor: '#4CAF50' }}
          disabled={isLoading}
        >
          Refresh Assessment (costs 1 query)
        </button>
      </div>

      <p style={{ color: '#666' }}>
        Based on {assessment.relevant_incidents_count} relevant incidents from similar organizations
      </p>

      {/* HIGH RISK */}
      {assessment.high_risk.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={{ color: '#d32f2f' }}>🔴 HIGH RISK - Act Within 7 Days</h2>
          {assessment.high_risk.map((threat) => (
            <ThreatCardComponent key={threat.threat_id} threat={threat} onViewPlaybook={handlePlaybookClick} />
          ))}
        </div>
      )}

      {/* MEDIUM RISK */}
      {assessment.medium_risk.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={{ color: '#f57c00' }}>🟡 MEDIUM RISK - Monitor & Prepare</h2>
          {assessment.medium_risk.map((threat) => (
            <ThreatCardComponent key={threat.threat_id} threat={threat} onViewPlaybook={handlePlaybookClick} />
          ))}
        </div>
      )}

      {/* LOW RISK */}
      {assessment.low_risk.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={{ color: '#999' }}>⚪ LOW RISK - Awareness Sufficient</h2>
          {assessment.low_risk.map((threat) => (
            <ThreatCardComponent key={threat.threat_id} threat={threat} onViewPlaybook={handlePlaybookClick} />
          ))}
        </div>
      )}

      {assessment.high_risk.length === 0 && assessment.medium_risk.length === 0 && assessment.low_risk.length === 0 && (
        <div style={emptyStateStyle}>
          <p>✅ Good News: Low Risk Profile</p>
          <p>Based on current threat landscape, we found no high-priority risks for organizations matching your profile.</p>
        </div>
      )}

      {/* Playbook Modal */}
      {selectedThreat && generatePlaybookMutation.data && (
        <PlaybookModal
          threat={selectedThreat}
          playbook={generatePlaybookMutation.data}
          onClose={() => {
            setSelectedThreat(null);
            generatePlaybookMutation.reset();
          }}
        />
      )}
    </div>
  );
}

interface ThreatCardComponentProps {
  threat: ThreatCard;
  onViewPlaybook: (threat: ThreatCard) => void;
}

function ThreatCardComponent({ threat, onViewPlaybook }: ThreatCardComponentProps) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h3>{threat.threat_name}</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            {threat.reasoning}
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Evidence:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>{threat.evidence.incident_count} incidents in last 30 days</li>
              <li>{threat.evidence.affected_orgs_count} similar organizations affected</li>
              <li>Average impact: ${threat.evidence.avg_loss.toLocaleString()}</li>
            </ul>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Your Exposure:</strong>
            <p style={{ color: '#d32f2f', marginTop: '0.5rem' }}>{threat.exposure.level}</p>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              {threat.exposure.factors.map((factor: string, idx: number) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <strong>Likelihood:</strong>
              <p style={{ margin: '0.5rem 0', fontSize: '1.2rem', color: '#0066cc' }}>
                {threat.likelihood_percentage}%
              </p>
            </div>
            <div>
              <strong>Estimated Impact:</strong>
              <p style={{ margin: '0.5rem 0', fontSize: '1.2rem', color: '#d32f2f' }}>
                ${threat.estimated_impact.min.toLocaleString()} - ${threat.estimated_impact.max.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onViewPlaybook(threat)}
        style={{ ...buttonStyle, backgroundColor: '#4CAF50' }}
      >
        View Preventive Playbook
      </button>
    </div>
  );
}

interface PlaybookModalProps {
  threat: ThreatCard;
  playbook: any;
  onClose: () => void;
}

function PlaybookModal({ threat, playbook, onClose }: PlaybookModalProps) {
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>🛡️ Preventive Playbook: {threat.threat_name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        <div style={{ maxHeight: '600px', overflowY: 'auto', marginBottom: '1.5rem' }}>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', color: '#333' }}>
            {playbook.full_text}
          </div>
        </div>

        <button onClick={onClose} style={buttonStyle}>
          Close
        </button>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
  padding: '1.5rem',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
  border: '1px solid #ddd',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '1.5rem',
  marginBottom: '1rem',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#0066cc',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.95rem',
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '2rem',
  borderRadius: '8px',
  border: '1px solid #ddd',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
};

const warningStyle: React.CSSProperties = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  color: '#856404',
  padding: '1rem',
  borderRadius: '4px',
  marginBottom: '2rem',
};

const emptyStateStyle: React.CSSProperties = {
  backgroundColor: '#f1f8e9',
  border: '1px solid #558b2f',
  color: '#33691e',
  padding: '2rem',
  borderRadius: '6px',
  textAlign: 'center',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '2rem',
  maxWidth: '800px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
};
