import { useState } from 'react';
import dagre from 'dagre';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from './layout';
import DiamondNode from './components/DiamondNode'; // adjust path if needed

async function getFlowFromTranscript(transcript) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_OPEN_API_KEY`,  // 🔑 REPLACE THIS
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `
        You are an AI assistant that extracts logical process flows from messy meeting transcripts or conversations.
        
        Your task is to:
        - Remove small talk, greetings, interruptions, or filler phrases
        - Focus only on steps, decisions, processes, actions, or logical sequences
        - Output the result as clean, numbered bullet points
        - Use conditional logic like “If X, then Y”
        - Make it suitable for flowchart generation
        - Then convert that list into a React Flow diagram
        - You may include optional sticky notes using a node with type: \"sticky\" for non-process comments or tips.

        Parse the transcript into structured JSON with "type" for each block:
        Make sure every node has a "type" field — do not leave it blank.
        - "start" or "end"
        - "process" for actions
        - "decision" for branching logic
        - "io" for user/system input/output
        - "note" for side pointers

        Make sure every node is connected to the main flow via an edge. 
        There should be no isolated nodes. 

        Respond ONLY with valid JSON like:
        { "nodes": [...], "edges": [...], "type": [...]}
        Remove the "json" text at the start if there is any
        
        For decision box, use following format to output for each path:
        { "source": <decisionNodeId>, "target": <yesOutcomeNodeId>, "sourceHandle": "left", "label": "Yes" }
        { "source": <decisionNodeId>, "target": <noOutcomeNodeId>, "sourceHandle": "right", "label": "No" }

        Do NOT include position fields. Only provide: id, data.label, type (optional), and edge info.
        Positioning will be handled separately.
        
        Do not include any explanations, markdown, or code comments.
            `
        },
        {
          role: 'user',
          content: transcript
        }
      ]
    })
  });

  const data = await response.json();
  try {
    console.log("GPT raw response:", data.choices[0].message.content);
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { nodes: [], edges: [], type: [] };
  }
}

function StickyNoteNode({ data }) {
  return (
    <div
      style={{
        background: '#FFF176',
        padding: 12,
        fontSize: 14,
        fontFamily: 'Comic Sans MS',
        borderRadius: 6,
        minWidth: 150,
        boxShadow: '2px 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      📌 {data.label}
    </div>
  );
}


export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [input, setInput] = useState("User logs in. System checks credentials. If valid, show dashboard. If not, show error. Remember to finish it by this weekend");

  const nodeTypes = {
    sticky: StickyNoteNode,
    note: StickyNoteNode,
  };

  const handleSubmit = async () => {
    const flow = await getFlowFromTranscript(input);

    // 🧠 Validate the response structure
    if (!flow.nodes || !flow.edges) {
      alert("GPT response is missing nodes or edges!");
      return;
    }

    // 🧪 Optional: Warn if any node is not connected to the graph
    const nodeIds = new Set(flow.nodes.map(n => n.id));
    const danglingNodes = flow.nodes.filter(
      node => !flow.edges.some(edge =>
        edge.source === node.id || edge.target === node.id
      )
    );

    if (danglingNodes.length > 0) {
      console.warn("⚠️ Unconnected nodes:", danglingNodes.map(n => n.id));
      alert(`Warning: ${danglingNodes.length} node(s) are unconnected.`);
    }
    const cleanedNodes = flow.nodes.map((n) => {
      const { position, ...rest } = n;
      return rest;
    });

        // Deduplicate edges: one per source → target
    const seen = new Set();

    const cleanedEdges = flow.edges
      .filter((e) => {
        const key = `${e.source}-${e.target}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e) => ({
        ...e,
        type: 'smoothstep',
        label: e.label,
        sourceHandle: e.sourceHandle || undefined,  // 👈 preserve sourceHandle if provided
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

    const styledNodes = cleanedNodes.map((node) => {
      const baseStyle = {
        border: '1px solid #999',
        borderRadius: 20,
        padding: 10,
        fontSize: '14px',
        textAlign: 'center',
      };
    
      switch (node.type) {
        case 'start':
        case 'end':
          return {
            ...node,
            style: {
              ...baseStyle,
              backgroundColor: '#d1e7dd', // soft green
              borderRadius: 30,
            },
          };
    
        case 'process':
          return {
            ...node,
            style: {
              ...baseStyle,
              backgroundColor: '#e7f1ff', // soft blue
            },
          };
        case 'decision':
          return {
            ...node,
            style: {
              borderRadius: '60%',
            }
            // No style needed — handled in DiamondNode
          };
    
        case 'note':
        case 'sticky':
          return {
            ...node,
            // No style needed — handled in StickyNoteNode
          };
    
        default:
          return {
            ...node,
            style: {
              ...baseStyle,
              backgroundColor: '#f0e5ff', // fallback color
            },
          };
      }
    });
        
    console.log(styledNodes);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(styledNodes, cleanedEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    console.log(layoutedNodes);

  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <div style={{ padding: 10 }}>
        <textarea
          rows={4}
          style={{ width: '80%' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={handleSubmit} style={{ marginLeft: 10 }}>Generate Flowchart</button>
      </div>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}