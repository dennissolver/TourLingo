import React from 'react';

// Note: This component wraps qrcode.react which should be installed in the app
// For now, we provide the wrapper interface

export interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  includeMargin?: boolean;
}

export function QRCode({
  value,
  size = 200,
  bgColor = '#ffffff',
  fgColor = '#000000',
  includeMargin = true,
}: QRCodeProps) {
  // This will be replaced with actual QRCodeSVG from qrcode.react
  // when imported in the app
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      data-qr-value={value}
      data-qr-size={size}
      data-qr-fg={fgColor}
      data-qr-margin={includeMargin}
    >
      {/* QRCodeSVG will be rendered here */}
      <span className="text-xs text-gray-400">QR: {value.slice(0, 20)}...</span>
    </div>
  );
}

export interface QRCodeCardProps {
  value: string;
  code: string;
  onCopy?: () => void;
}

export function QRCodeCard({ value, code, onCopy }: QRCodeCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex justify-center mb-4">
        <QRCode value={value} size={160} />
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-2">Or enter code:</p>
        <button
          onClick={onCopy}
          className="font-mono text-xl font-bold tracking-widest text-gray-900 hover:text-primary-600"
        >
          {code}
        </button>
      </div>
    </div>
  );
}
