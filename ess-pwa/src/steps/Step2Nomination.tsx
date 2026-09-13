import SignatureField from '../components/SignatureField';
import type { JobRecord } from '../types';

interface Props {
  job: JobRecord;
  onChange: (patch: Partial<JobRecord>) => void;
}

const NOMINATION_TEXT = `EC FOCUS NOMINATION - NSW ENERGY SAVINGS SCHEME (ESS) / PEAK DEMAND REDUCTION SCHEME (PDRS)

By signing below, the customer confirms they are the account holder (or authorised occupier) at the site address
provided, and nominates EC Focus as their Accredited Certificate Provider (ACP) representative to create Energy
Savings Certificates (ESCs) and/or Peak Reduction Certificates (PRCs) arising from the installation of eligible
energy-efficiency equipment at this site under the Energy Savings Scheme Rule / Peak Demand Reduction Scheme Rule.

The customer acknowledges: (1) any statutory co-payment for the eligible activity is payable by the customer;
(2) the right to create certificates for this activity is assigned to EC Focus / Altisity for the duration of the
scheme's certificate-creation window; (3) the customer's details and equipment details recorded in this app will
be used solely for scheme compliance, audit and certificate creation purposes; (4) this nomination may be
audited by the scheme regulator (IPART) and the customer consents to being contacted for verification.`;

export default function Step2Nomination({ job, onChange }: Props) {
  const sig = job.signatures.customerNomination;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">2. EC Focus Nomination &amp; Pre-Install Sign-Off</h2>

      <pre className="whitespace-pre-wrap text-xs border rounded p-2 bg-gray-50 max-h-56 overflow-y-auto">
        {NOMINATION_TEXT}
      </pre>

      <label className="block text-sm">
        Signer full name
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={sig?.signerName ?? ''}
          onChange={(e) =>
            onChange({
              signatures: {
                ...job.signatures,
                customerNomination: {
                  dataUrl: sig?.dataUrl ?? '',
                  timestamp: sig?.timestamp ?? '',
                  signerName: e.target.value
                }
              }
            })
          }
        />
      </label>

      <SignatureField
        label="Customer signature (nomination)"
        signedDataUrl={sig?.dataUrl || null}
        onSign={(dataUrl) =>
          onChange({
            signatures: {
              ...job.signatures,
              customerNomination: {
                signerName: sig?.signerName ?? '',
                dataUrl,
                timestamp: new Date().toISOString()
              }
            }
          })
        }
      />
    </div>
  );
}
