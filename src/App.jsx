import { useState, useCallback } from 'react';
import dagre from 'dagre';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from './layout';
import DiamondNode from './components/DiamondNode';

/* ------------------------------------------------------------------ */
/* GPT call – now receives (chunk, context, currentFlow)              */
/* ------------------------------------------------------------------ */
async function extendFlowWithChunk({ chunk, context, currentFlow }) {
  const apiKey = import.meta.env.VITE_OPEN_API_KEY;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `
        You are an AI assistant that extends an existing React-Flow diagram. If the existing flow is empty, you will create a new flow based on the chunk provided.
        RULES:
        • The JSON in "existingFlow" is final—do NOT change or delete anything inside it.
        • Only add new nodes / edges that represent info in the newChunk.
        • Make sure every new node is connected; no isolates.
        • Respond with all nodes and edges, including existing ones, but don't change the structure of existing nodes/edges.
        Remove any “json” preamble.

        You are an AI assistant that extracts logical process flows from messy meeting transcripts or conversations.
        
        Your task is to:
        - Remove small talk, greetings, interruptions, or filler phrases
        - Focus only on steps, decisions, processes, actions, or logical sequences
        - Output the result as clean, numbered bullet points
        - Use conditional logic like “If X, then Y”
        - Make it suitable for flowchart generation
        - Then convert that list into a React Flow diagram
        - You may include optional sticky notes using a node with type: "sticky"for non-process comments or tips.

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
`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            existingFlow: currentFlow,   // ← what’s already on screen
            contextSoFar: context,       // ← full transcript until now
            newChunk: chunk,             // ← just-received audio slice
          }),
        },
      ],
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content); // only NEW nodes/edges
}

/* ------------------------------------------------------------------ */
/* Sticky-note component                                               */
/* ------------------------------------------------------------------ */
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
          }}>
        📌 {data.label}
      </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function App() {
  /* ------ diagram & transcript state ------ */
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [context, setContext] = useState(''); // ← running transcript

  const nodeTypes = { sticky: StickyNoteNode, note: StickyNoteNode };

  /* ------ helper: style new nodes just like before ------ */
  const styleNodes = useCallback((incoming) =>
      incoming.map((node) => {
        const base = {
          border: '1px solid #999',
          borderRadius: 20,
          padding: 10,
          fontSize: 14,
          textAlign: 'center',
        };
        switch (node.type) {
          case 'start':
          case 'end':
            return { ...node, style: { ...base, background: '#d1e7dd', borderRadius: 30 } };
          case 'process':
            return { ...node, style: { ...base, background: '#e7f1ff' } };
          case 'decision':
            return { ...node }; // rendered via DiamondNode
          default:
            return { ...node, style: { ...base, background: '#f0e5ff' } };
        }
      }), []);

  /* ------ ingest one audio chunk ------ */
  const handleChunk = async (chunk) => {
    // 1️⃣ grow the running transcript immediately
    setContext((prev) => prev + ' ' + chunk);

    // 2️⃣ ask GPT to *extend* the current flow
    const increment = await extendFlowWithChunk({
      chunk,
      context: context + ' ' + chunk,   // ← include the just-added words too
      currentFlow: { nodes, edges },
    });

    // 3️⃣ merge: ignore ids we already have, add only new stuff
    const existingIds = new Set(nodes.map((n) => n.id));
    const newNodes = styleNodes(
        increment.nodes.filter((n) => !existingIds.has(n.id))
    );

    const seenEdge = new Set(edges.map((e) => `${e.source}-${e.target}`));
    const newEdges = increment.edges
        .filter((e) => !seenEdge.has(`${e.source}-${e.target}`))
        .map((e) => ({
          ...e,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }));

    // 4️⃣ re-layout everything
    const allNodes = [...nodes, ...newNodes];
    const allEdges = [...edges, ...newEdges];
    const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(allNodes, allEdges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  };

  /* ------------------------------------------------------- */
  /* Quick UI for testing: textarea simulates a new chunk     */
  /* ------------------------------------------------------- */
  const [chunkDraft, setChunkDraft] = useState(
      'User uploads a file. System validates format.'
  );

  return (
      <div style={{ height: '100vh', width: '100%' }}>
        <div style={{ padding: 10 }}>
        <textarea
            rows={2}
            style={{ width: '70%' }}
            value={chunkDraft}
            onChange={(e) => setChunkDraft(e.target.value)}
        />
          <button onClick={() => handleChunk(chunkDraft)} style={{ marginLeft: 10 }}>
            ➕ Add Chunk
          </button>
        </div>

        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
  );
}
