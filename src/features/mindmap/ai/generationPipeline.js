import { normalizeNodeType } from "./classification";
import { toCanvasGraph } from "./graphAdapters";
import { layoutMindmapGraph } from "./layoutEngine";
import { normalizeMindmapGraph, validateMindmapGraph } from "./mindmapSchema";
import { buildMindmapToolBundle, DEFAULT_MINDMAP_POLICY } from "./toolContracts";

const capNodes = (graph, maxNodes) => {
  if (!Array.isArray(graph.nodes) || graph.nodes.length <= maxNodes) {
    return graph;
  }

  const keptNodeIds = new Set(graph.nodes.slice(0, maxNodes).map((node) => node.id));
  return {
    ...graph,
    nodes: graph.nodes.slice(0, maxNodes),
    edges: (graph.edges || []).filter(
      (edge) => keptNodeIds.has(edge.from) && keptNodeIds.has(edge.to)
    ),
  };
};

const enforceTypeAndRoot = (graph) => {
  const nodes = graph.nodes.map((node, index) => ({
    ...node,
    type:
      index === 0
        ? "root"
        : normalizeNodeType(node.type, node.label, node.parentId ? "concept" : "group"),
  }));

  return {
    ...graph,
    nodes,
  };
};

export const prepareMindmapGenerationRequest = (input = {}, policy = DEFAULT_MINDMAP_POLICY) => {
  const request = {
    topic: String(input.topic || "").trim() || "Untitled Topic",
    context: String(input.context || "").trim(),
    language: input.language || policy.language,
    maxNodes: Number.isFinite(input.maxNodes) ? input.maxNodes : policy.maxNodes,
    maxDepth: Number.isFinite(input.maxDepth) ? input.maxDepth : policy.maxDepth,
  };

  return {
    request,
    toolBundle: buildMindmapToolBundle(request, policy),
  };
};

export const finalizeGeneratedMindmap = (rawGraph, options = {}) => {
  const maxNodes = Number.isFinite(options.maxNodes) ? options.maxNodes : DEFAULT_MINDMAP_POLICY.maxNodes;
  const worldCenterX = Number.isFinite(options.worldCenterX) ? options.worldCenterX : 10000;
  const worldCenterY = Number.isFinite(options.worldCenterY) ? options.worldCenterY : 10000;

  let graph = normalizeMindmapGraph(rawGraph);
  graph = capNodes(graph, maxNodes);
  graph = enforceTypeAndRoot(graph);
  graph = layoutMindmapGraph(graph, { worldCenterX, worldCenterY });

  const validation = validateMindmapGraph(graph);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      graph: null,
      canvasGraph: null,
    };
  }

  const canvasGraph = toCanvasGraph(graph);
  return {
    ok: true,
    errors: [],
    graph,
    canvasGraph,
  };
};

