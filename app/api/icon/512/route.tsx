import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 256,
          background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '100px',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)',
        }}
      >
        ✦
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
