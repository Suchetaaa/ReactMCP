import { Handle, Position } from 'reactflow';

export default function DiamondNode({ data }) {
  const size = 100; // smaller = tighter layout
  const half = size / 2;

//   const handleStyle = {
//     background: '#555',
//     width: 8,
//     height: 8,
//     borderRadius: '50%',
//   };

  return (
    <div
      style={{
        width: 120,
        height: 120,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow:'visible' }}>
        <polygon
          points="50,0 100,50 50,100 0,50"
          fill="#fef3c7"
          stroke="#eab308"
          strokeWidth={2}
        />
        <foreignObject x={10} y={20} width={100} height={60}>
        <div
            style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: '12px',
            color: '#1c1917',
            padding: '4px',
            overflow: 'visible', // this helps with some browsers
            wordWrap: 'break-word',
            }}
        >
            {data.label || 'Decision'}
          </div>
        </foreignObject>
      </svg>

      <Handle type="target" position={Position.Top} style={{ background: '#333' }} />
      <Handle id="left" type="source" position={Position.Left} style={{ top: '50%', background: '#333' }} />
      <Handle id="right" type="source" position={Position.Right} style={{ top: '50%', background: '#333' }} />
    </div>
  );
}
