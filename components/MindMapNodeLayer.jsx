import React from "react";
import MindMapNode from "./MindMapNode";

export default function MindMapNodeLayer({
  nodes = [],
  draggable = false,
  showHandles = false,
  connectMode = false,
  selectedNodeId = null,
  onTextCommit,
  onNodePress,
  onDeleteRequest,
  onContextMenuRequest,
  onPositionChange,
  viewportScale,
  canvasPanGesture,
  activeDragNodeId,
  activeDragX,
  activeDragY,
}) {
  return nodes.map((node) => (
    <MindMapNode
      key={node.id}
      id={node.id}
      text={node.text || node.label || node.data?.text}
      x={node.x}
      y={node.y}
      width={node.width}
      minHeight={node.height}
      draggable={draggable}
      showHandles={showHandles}
      selected={selectedNodeId === node.id}
      connectMode={connectMode}
      onTextCommit={onTextCommit}
      onNodePress={onNodePress}
      onDeleteRequest={onDeleteRequest}
      onContextMenuRequest={onContextMenuRequest}
      onPositionChange={onPositionChange}
      viewportScale={viewportScale}
      canvasPanGesture={canvasPanGesture}
      activeDragNodeId={activeDragNodeId}
      activeDragX={activeDragX}
      activeDragY={activeDragY}
    />
  ));
}
