import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface Props {
  label: string;
  onSign: (dataUrl: string) => void;
  signedDataUrl?: string | null;
}

export default function SignatureField({ label, onSign, signedDataUrl }: Props) {
  const padRef = useRef<SignatureCanvas>(null);

  function handleClear() {
    padRef.current?.clear();
    onSign('');
  }

  function handleEnd() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    onSign(pad.getTrimmedCanvas().toDataURL('image/png'));
  }

  if (signedDataUrl) {
    return (
      <div className="border rounded p-2 space-y-1">
        <span className="text-sm font-medium">{label}</span>
        <img src={signedDataUrl} alt={`${label} signature`} className="border bg-white h-24" />
        <button type="button" onClick={handleClear} className="text-xs text-blue-600 underline">
          Re-sign
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded p-2 space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <SignatureCanvas
        ref={padRef}
        penColor="black"
        canvasProps={{ className: 'border bg-white w-full h-32 touch-none' }}
        onEnd={handleEnd}
      />
      <button type="button" onClick={handleClear} className="text-xs text-blue-600 underline">
        Clear
      </button>
    </div>
  );
}
