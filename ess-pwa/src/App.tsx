import React, { useState, useEffect } from 'react';
import { JobSearchBar } from './components/JobSearchBar';
import { SAMPLE_JOBS, PreloadedJob } from './data/sampleJobs';
import { getPhotoRequirements } from './data/photoRequirements';

const TEAM_PIN = '2577'; // Team unlock PIN
const OFFICE_EMAIL = 'office@echoairconditioning.com.au'; // Target office email

interface CapturedPhoto {
  url: string;
  lat?: number;
  lng?: number;
  timestamp: string;
}

export default function App() {
  // 1. PIN Gate State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('echo_auth') === 'true';
  });
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // 2. Job & Form State
  const [jobs, setJobs] = useState<PreloadedJob[]>(() => {
    const saved = localStorage.getItem('echo_jobs');
    return saved ? JSON.parse(saved) : SAMPLE_JOBS;
  });
  const [selectedJob, setSelectedJob] = useState<PreloadedJob | null>(null);
  const [jobType, setJobType] = useState<'replacement' | 'new'>('replacement');
  const [needsReclaim, setNeedsReclaim] = useState<boolean>(true);
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);

  // Quick Add Form Inputs
  const [newCustName, setNewCustName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newModel, setNewModel] = useState('');

  // 3. Photo Captures & GPS Tracking
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, CapturedPhoto>>({});
  const [isLocating, setIsLocating] = useState<string | null>(null);

  // Persist jobs offline
  useEffect(() => {
    localStorage.setItem('echo_jobs', JSON.stringify(jobs));
  }, [jobs]);

  // Handle PIN authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === TEAM_PIN) {
      localStorage.setItem('echo_auth', 'true');
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setEnteredPin('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('echo_auth');
    setIsAuthenticated(false);
    setEnteredPin('');
  };

  const handleSelectJob = (job: PreloadedJob) => {
    setSelectedJob(job);
    setJobType(job.jobType);
    setNeedsReclaim(job.needsReclaim);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newAddress) return;

    const createdJob: PreloadedJob = {
      simproJobId: `LOCAL-${Date.now().toString().slice(-4)}`,
      customerName: newCustName,
      address: newAddress,
      phone: newPhone || 'N/A',
      email: '',
      jobType,
      needsReclaim,
      activityCode: 'HEER-HVAC 1-D16',
      installedUnit: {
        brand: 'Generic / Custom',
        model: newModel || 'Pending plate photo',
        heatingKw: 'TBD'
      }
    };

    setJobs((prev) => [createdJob, ...prev]);
    setSelectedJob(createdJob);
    setShowQuickAdd(false);
    setNewCustName('');
    setNewAddress('');
    setNewPhone('');
    setNewModel('');
  };

  // 4. GPS-Enabled Photo Capture Handler
  const handlePhotoCapture = (photoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localUrl = URL.createObjectURL(file);

    setIsLocating(photoId);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCapturedPhotos((prev) => ({
            ...prev,
            [photoId]: {
              url: localUrl,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestamp: timeStr
            }
          }));
          setIsLocating(null);
        },
        (err) => {
          console.warn('GPS location error:', err.message);
          // Fallback without coordinates if GPS access is denied
          setCapturedPhotos((prev) => ({
            ...prev,
            [photoId]: {
              url: localUrl,
              timestamp: timeStr
            }
          }));
          setIsLocating(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setCapturedPhotos((prev) => ({
        ...prev,
        [photoId]: {
          url: localUrl,
          timestamp: timeStr
        }
      }));
      setIsLocating(null);
    }
  };

  // 5. Complete Job & Email Office
  const photoList = getPhotoRequirements({ jobType, needsReclaim });

  const handleSendToOffice = () => {
    if (!selectedJob) {
      alert('Please select or add a job first.');
      return;
    }

    const capturedCount = Object.keys(capturedPhotos).length;
    const subject = encodeURIComponent(`[COMPLIANCE READY] ${selectedJob.simproJobId} - ${selectedJob.customerName} - ${selectedJob.address}`);

    const body = encodeURIComponent(
`Hi Office,

Compliance photo evidence and installation details have been captured on-site:

--- JOB DETAILS ---
Customer: ${selectedJob.customerName}
Site Address: ${selectedJob.address}
Contact Phone: ${selectedJob.phone}
SimPRO Job #: ${selectedJob.simproJobId}

--- INSTALLATION INFO ---
Activity: ${selectedJob.activityCode}
Job Type: ${jobType.toUpperCase()}
Refrigerant Reclaimed: ${jobType === 'replacement' ? (needsReclaim ? 'YES' : 'NO') : 'N/A (New Install)'}
Installed Unit: ${selectedJob.installedUnit.brand} ${selectedJob.installedUnit.model} (${selectedJob.installedUnit.heatingKw} kW)

--- CHECKLIST & LOCATION STATUS ---
Status: ${capturedCount} of ${photoList.length} photos captured with GPS coordinates.

Sent from Echo Air Conditioning Compliance PWA.`
    );

    window.location.href = `mailto:${OFFICE_EMAIL}?subject=${subject}&body=${body}`;
  };

  // SCREEN A: PIN Lock Screen
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '380px', margin: '5rem auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>
          Echo Air Conditioning
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
          Enter technician team PIN to unlock
        </p>

        <form onSubmit={handlePinSubmit}>
          <input
            type="password"
            maxLength={6}
            value={enteredPin}
            onChange={(e) => setEnteredPin(e.target.value)}
            placeholder="Enter PIN"
            autoFocus
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '1.5rem',
              textAlign: 'center',
              letterSpacing: '0.35rem',
              borderRadius: '8px',
              border: pinError ? '2px solid #ef4444' : '2px solid #d1d5db',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '0.75rem'
            }}
          />
          {pinError && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Incorrect PIN. Please try again.
            </div>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Unlock Portal
          </button>
        </form>
      </div>
    );
  }

  // SCREEN B: Main Authenticated App
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.25rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '1.25rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            Echo Air Conditioning — EC Focus
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>● Ready Offline</span>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              Lock
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          style={{
            padding: '0.45rem 0.85rem',
            backgroundColor: showQuickAdd ? '#ef4444' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          {showQuickAdd ? 'Close' : '+ Quick Add Job'}
        </button>
      </header>

      {/* Quick Add Form */}
      {showQuickAdd && (
        <form onSubmit={handleQuickAdd} style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>Quick Add On-Site Job</h4>
          <input
            type="text"
            placeholder="Customer Name *"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <input
            type="text"
            placeholder="Site Address *"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              placeholder="Phone (optional)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
            <input
              type="text"
              placeholder="Unit Model (optional)"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit"
            style={{ width: '100%', padding: '0.6rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
          >
            Save & Open Checklist
          </button>
        </form>
      )}

      {/* Customer / Job Search Bar */}
      <JobSearchBar onSelectJob={handleSelectJob} />

      {/* Selected Job Card */}
      {selectedJob && (
        <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: '#166534' }}>{selectedJob.customerName} ({selectedJob.simproJobId})</div>
          <div style={{ fontSize: '0.85rem', color: '#15803d' }}>📍 {selectedJob.address}</div>
          <div style={{ fontSize: '0.85rem', color: '#15803d' }}>📞 {selectedJob.phone}</div>
          <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '0.25rem' }}>
            ❄️ <strong>Unit:</strong> {selectedJob.installedUnit.brand} {selectedJob.installedUnit.model}
          </div>
        </div>
      )}

      {/* Job Type Toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.25rem', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="radio"
            name="jobType"
            checked={jobType === 'replacement'}
            onChange={() => setJobType('replacement')}
          />
          Replacement
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="radio"
            name="jobType"
            checked={jobType === 'new'}
            onChange={() => setJobType('new')}
          />
          New Installation
        </label>

        {jobType === 'replacement' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', marginLeft: 'auto', color: '#b45309', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={needsReclaim}
              onChange={(e) => setNeedsReclaim(e.target.checked)}
            />
            Refrigerant Reclaimed
          </label>
        )}
      </div>

      {/* Required Photos Checklist */}
      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: '#1f2937' }}>
        Required Photos ({photoList.length})
      </h3>

      {photoList.map((photo, i) => {
        const itemCapture = capturedPhotos[photo.id];
        return (
          <div key={photo.id} style={{ padding: '0.85rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                {i + 1}. {photo.title}
              </div>
              
              {/* Location Badge */}
              {itemCapture?.lat ? (
                <span style={{ fontSize: '0.72rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                  📍 Geo-tagged ({itemCapture.lat.toFixed(4)}, {itemCapture.lng?.toFixed(4)}) • {itemCapture.timestamp}
                </span>
              ) : isLocating === photo.id ? (
                <span style={{ fontSize: '0.72rem', color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                  🛰️ Acquiring GPS...
                </span>
              ) : itemCapture ? (
                <span style={{ fontSize: '0.72rem', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                  ✓ Captured ({itemCapture.timestamp})
                </span>
              ) : (
                photo.requiresGeo && (
                  <span style={{ fontSize: '0.72rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                    Geo-tag Required
                  </span>
                )
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0.5rem' }}>
              {photo.description}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoCapture(photo.id, e)}
                style={{ fontSize: '0.85rem' }}
              />
              {itemCapture?.url && (
                <img
                  src={itemCapture.url}
                  alt="preview"
                  style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Complete Job & Email Button */}
      <div style={{ marginTop: '1.75rem', paddingBottom: '2.5rem' }}>
        <button
          onClick={handleSendToOffice}
          style={{
            width: '100%',
            padding: '0.9rem',
            backgroundColor: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
          }}
        >
          ✉️ Complete Job & Email Office
        </button>
      </div>
    </div>
  );
}