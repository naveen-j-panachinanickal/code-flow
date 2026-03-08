import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 96,
          background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '40px',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
        }}
      >
        ✦
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
