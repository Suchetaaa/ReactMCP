import { Handle, Position } from 'reactflow';

export default function DiamondNode({ data }) {
  const size = 100; // smaller = tighter layout
  const half = size / 2;

  const handleStyle = {
    background: '#555',
    width: 8,
    height: 8,
    borderRadius: '50%',
  };

  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
  {/* Border layer */}
  <div style={{
    position: 'absolute',
    width: '100%',
    height: '100%',
    display:'flex',
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    border: '2px solid #d1d5db',
    boxSizing: 'border-box',
    zIndex: 1,
  }} />

  {/* Inner content */}
  <div style={{
    width: '100%',
    height: '100%',
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    backgroundColor: '#fff3cd',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    position: 'relative',
    fontSize: '14px',
    textAlign: 'center',
  }}>
            {data.label}
        </div>

      {/* Top */}
      <Handle
        type="target"
        position="top"
        // style={{ left: '50%', top: -8 }}
      />

      {/* Bottom */}
      <Handle
        type="source"
        position="bottom"
        style={{ left: '50%', bottom: -8 }}
      />

      {/* Left */}
      <Handle
        type="source"
        id="yes"
        position="left"
        style={{ top: '50%', left: -8 }}
      />

      {/* Right */}
      <Handle
        type="source"
        id="no"
        position="right"
        style={{ top: '50%', right: -8 }}
      />
    </div>
  );
}
