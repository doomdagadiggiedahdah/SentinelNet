import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface Vulnerability {
  name: string;
  risk_level: string;
  why_vulnerable: string[];
  likelihood_percentage: number;
  estimated_impact_min: number;
  estimated_impact_max: number;
  defense_plan: string;
}

interface ThreatResearchReport {
  report_id: string;
  generated_at: string;
  org_description: string;
  extracted_profile: Record<string, any>;
  vulnerabilities: Vulnerability[];
  executive_summary: Record<string, number>;
  search_queries: string[];
  sources_analyzed: number;
}

export function ThreatResearch() {
  const [description, setDescription] = useState('');
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [scanReport, setScanReport] = useState<ThreatResearchReport | null>(null);

  const scanMutation = useMutation({
    mutationFn: async (desc: string) => {
      const res = await apiClient.post<ThreatResearchReport>('/threat-research/scan', {
        org_description: desc,
      });
      return res;
    },
    onSuccess: (data) => {
      setScanReport(data);
      setDescription('');
    },
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.length < 50) {
      alert('Please provide at least 50 characters');
      return;
    }
    scanMutation.mutate(description);
  };

  if (scanReport) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setScanReport(null)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#999',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Back to Scanner
          </button>
        </div>

        <h1>🔬 Vulnerability Research Report</h1>

        <div style={headerStyle}>
          <div>
            <strong>Report ID:</strong> {scanReport.report_id}
          </div>
          <div>
            <strong>Generated:</strong> {new Date(scanReport.generated_at).toLocaleString()}
          </div>
          <div>
            <strong>Sources Analyzed:</strong> {scanReport.sources_analyzed}
          </div>
        </div>

        {/* Executive Summary */}
        <div style={summaryStyle}>
          <h2>📊 Summary</h2>
          <p>
            <strong>Identified Vulnerabilities:</strong> {scanReport.executive_summary.total_vulnerabilities}
          </p>
          <ul style={{ paddingLeft: '2rem', margin: '0.5rem 0' }}>
            {scanReport.executive_summary.critical_count > 0 && <li>🔴 {scanReport.executive_summary.critical_count} CRITICAL</li>}
            {scanReport.executive_summary.high_count > 0 && <li>🟠 {scanReport.executive_summary.high_count} HIGH</li>}
            {scanReport.executive_summary.medium_count > 0 && <li>🟡 {scanReport.executive_summary.medium_count} MEDIUM</li>}
          </ul>
          {scanReport.executive_summary.total_vulnerabilities === 0 && (
            <p style={{ color: '#2e7d32' }}>✅ No vulnerabilities identified!</p>
          )}
        </div>

        {/* Extracted Profile */}
        <div style={summaryStyle}>
          <h2>Organization Profile (Extracted)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <strong>Sector:</strong> {scanReport.extracted_profile.sector || 'Unknown'}
            </div>
            <div>
              <strong>Size:</strong> {scanReport.extracted_profile.size || 'Unknown'}
            </div>
            {scanReport.extracted_profile.systems && scanReport.extracted_profile.systems.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Systems:</strong> {scanReport.extracted_profile.systems.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Vulnerabilities */}
        {scanReport.vulnerabilities.length > 0 ? (
          scanReport.vulnerabilities.map((vuln, idx) => (
            <VulnerabilityCard
              key={idx}
              vuln={vuln}
              onSelect={() => setSelectedVuln(vuln)}
            />
          ))
        ) : (
          <div style={emptyStateStyle}>
            <p>✅ Good News!</p>
            <p>Based on recent security research, we found no critical vulnerabilities matching your organization's profile.</p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
              Threat landscape changes rapidly. We recommend scanning weekly.
            </p>
          </div>
        )}

        {/* Defense Plan Modal */}
        {selectedVuln && (
          <DefensePlanModal vuln={selectedVuln} onClose={() => setSelectedVuln(null)} />
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔬 AI Vulnerability Scanner</h1>

      <div style={introStyle}>
        <p>
          Describe your organization and we'll analyze recent security research to identify vulnerabilities
          specific to your environment.
        </p>
      </div>

      <form onSubmit={handleScan} style={formStyle}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Organization Description
          </label>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Tell us about your organization, systems, and security posture. The more detail, the better.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: We're a 500-person hospital in North America. We use Okta for SSO, Office 365 for email, and a GPT-4 powered chatbot for patient scheduling. We have MFA on admin accounts but no phishing training or AI-specific security controls."
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
            }}
          />
          <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
            Character count: {description.length} / 2000
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="submit"
            disabled={scanMutation.isPending || description.length < 50}
            style={{
              ...buttonStyle,
              opacity: description.length < 50 ? 0.5 : 1,
              cursor: description.length < 50 ? 'not-allowed' : 'pointer',
            }}
          >
            {scanMutation.isPending ? 'Scanning... (30-45 seconds)' : 'Scan for Vulnerabilities'}
          </button>
        </div>

        <div style={helpStyle}>
          <h3>💡 What to include:</h3>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li>Industry/Sector (healthcare, finance, etc.)</li>
            <li>Organization size (number of employees)</li>
            <li>Key systems (SSO, cloud providers, AI tools)</li>
            <li>Current security measures (MFA, training, etc.)</li>
            <li>Known gaps or concerns</li>
          </ul>
        </div>
      </form>

      {scanMutation.error && (
        <div style={errorStyle}>
          <strong>Error:</strong> {(scanMutation.error as any).response?.data?.detail || 'Failed to scan'}
        </div>
      )}
    </div>
  );
}

interface VulnerabilityCardProps {
  vuln: Vulnerability;
  onSelect: () => void;
}

function VulnerabilityCard({ vuln, onSelect }: VulnerabilityCardProps) {
  const riskColors: Record<string, string> = {
    CRITICAL: '#d32f2f',
    HIGH: '#f57c00',
    MEDIUM: '#fbc02d',
    LOW: '#999',
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <h3>{vuln.name}</h3>

          <div style={{ marginBottom: '1rem' }}>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: riskColors[vuln.risk_level] || '#999',
                color: '#fff',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
              }}
            >
              {vuln.risk_level} RISK
            </span>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Why Your Organization is Vulnerable:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              {vuln.why_vulnerable.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <strong>Likelihood:</strong>
              <p style={{ margin: '0.25rem 0', fontSize: '1.1rem', color: '#0066cc' }}>
                {vuln.likelihood_percentage}%
              </p>
            </div>
            <div>
              <strong>Estimated Impact:</strong>
              <p style={{ margin: '0.25rem 0', fontSize: '1.1rem', color: '#d32f2f' }}>
                ${vuln.estimated_impact_min.toLocaleString()} - ${vuln.estimated_impact_max.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onSelect} style={{ ...buttonStyle, backgroundColor: '#4CAF50' }}>
        View Defense Plan
      </button>
    </div>
  );
}

interface DefensePlanModalProps {
  vuln: Vulnerability;
  onClose: () => void;
}

function DefensePlanModal({ vuln, onClose }: DefensePlanModalProps) {
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>🛡️ Defense Plan</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        <div style={{ maxHeight: '600px', overflowY: 'auto', marginBottom: '1.5rem' }}>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', color: '#333' }}>
            {vuln.defense_plan}
          </div>
        </div>

        <button onClick={onClose} style={buttonStyle}>
          Close
        </button>
      </div>
    </div>
  );
}

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

const formStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '2rem',
  borderRadius: '8px',
  border: '1px solid #ddd',
  marginBottom: '2rem',
};

const introStyle: React.CSSProperties = {
  backgroundColor: '#e3f2fd',
  border: '1px solid #2196f3',
  color: '#1565c0',
  padding: '1rem',
  borderRadius: '4px',
  marginBottom: '2rem',
};

const helpStyle: React.CSSProperties = {
  backgroundColor: '#f1f8e9',
  border: '1px solid #558b2f',
  color: '#33691e',
  padding: '1rem',
  borderRadius: '4px',
  fontSize: '0.9rem',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const summaryStyle: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  borderRadius: '6px',
  border: '1px solid #ddd',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#f0f4ff',
  border: '1px solid #ddd',
  padding: '1rem',
  borderRadius: '6px',
  marginBottom: '1.5rem',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '1rem',
};

const emptyStateStyle: React.CSSProperties = {
  backgroundColor: '#f1f8e9',
  border: '1px solid #558b2f',
  color: '#33691e',
  padding: '2rem',
  borderRadius: '6px',
  textAlign: 'center',
  marginTop: '2rem',
};

const errorStyle: React.CSSProperties = {
  backgroundColor: '#ffebee',
  border: '1px solid #ef5350',
  color: '#c62828',
  padding: '1rem',
  borderRadius: '4px',
  marginTop: '1rem',
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
