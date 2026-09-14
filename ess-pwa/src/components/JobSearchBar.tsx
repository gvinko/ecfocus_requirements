import React, { useState } from 'react';
import { SAMPLE_JOBS, PreloadedJob } from '../data/sampleJobs';

interface JobSearchBarProps {
  onSelectJob: (job: PreloadedJob) => void;
}

export const JobSearchBar: React.FC<JobSearchBarProps> = ({ onSelectJob }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PreloadedJob[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const q = value.toLowerCase();
    const matches = SAMPLE_JOBS.filter(
      (job) =>
        job.simproJobId.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        job.address.toLowerCase().includes(q)
    );

    setResults(matches);
    setIsOpen(true);
  };

  const selectJob = (job: PreloadedJob) => {
    onSelectJob(job);
    setQuery(`${job.customerName} - ${job.address}`);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#1f2937' }}>
        Search Existing Job / Customer
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Type Customer Name, Address, or SimPRO Job #..."
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1.5px solid #d1d5db',
          fontSize: '0.95rem',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      {isOpen && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: '4px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            maxHeight: '220px',
            overflowY: 'auto'
          }}
        >
          {results.map((job) => (
            <div
              key={job.simproJobId}
              onClick={() => selectJob(job)}
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
            >
              <div style={{ fontWeight: 600, color: '#111827' }}>
                {job.customerName} <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>({job.simproJobId})</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>{job.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};