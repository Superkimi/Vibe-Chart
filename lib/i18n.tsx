"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const englishMessages = {
  loading: "Preparing your diagram workspace",
  diagramDirectory: "Diagram directory",
  diagramStudio: "Diagram studio",
  newDiagram: "New diagram",
  architecture: "Architecture",
  flowchart: "Flowchart",
  erDiagram: "ER diagram",
  sequence: "Sequence",
  workspace: "Workspace",
  nodes: "{{count}} nodes",
  duplicateCurrentDiagram: "Duplicate current diagram",
  deleteCurrentDiagram: "Delete current diagram",
  duplicate: "Duplicate",
  delete: "Delete",
  savedLocally: "Saved locally in this browser.",
  saved: "Saved",
  diagramTitle: "Diagram title",
  undo: "Undo",
  redo: "Redo",
  editorView: "Editor view",
  canvas: "Canvas",
  code: "Code",
  add: "Add",
  process: "Process",
  decision: "Decision",
  database: "Database",
  service: "Service",
  external: "External",
  actor: "Actor",
  entity: "Entity",
  arrange: "Arrange",
  switchLanguage: "Switch language",
  chinese: "中文",
  english: "EN",
  useDarkTheme: "Use dark theme",
  useLightTheme: "Use light theme",
  exporting: "Exporting",
  export: "Export",
  pngImage: "PNG image",
  twoXResolution: "2x resolution",
  svgImage: "SVG image",
  scalableVector: "Scalable vector",
  drawio: "draw.io",
  editableXml: "Editable XML",
  mermaid: "Mermaid",
  diagramAsCode: "Diagram as code",
  vibeJson: "Vibe JSON",
  canonicalSchema: "Canonical schema",
  diagramInspector: "Diagram inspector",
  properties: "Properties",
  ai: "AI",
  selectedNode: "Selected node",
  deleteSelectedNode: "Delete selected node",
  label: "Label",
  description: "Description",
  shape: "Shape",
  accent: "Accent",
  toneAccent: "{{tone}} accent",
  lilac: "Lilac",
  slate: "Slate",
  cyan: "Cyan",
  amber: "Amber",
  rose: "Rose",
  fields: "Fields",
  fieldHint: "One field per line: type name constraint",
  selectedConnection: "Selected connection",
  deleteSelectedConnection: "Delete selected connection",
  edgeLabelPlaceholder: "request, publishes, retries…",
  lineStyle: "Line style",
  smoothstep: "Smooth step",
  straight: "Straight",
  bezier: "Bezier",
  animateDirection: "Animate direction",
  selectNode: "Select a node",
  selectNodeHint: "Click a node on the canvas to edit its content and style.",
  vibeWithChart: "Vibe with your chart",
  configureModel: "Configure model",
  modelSettings: "Model settings",
  providerEndpoint: "Provider endpoint",
  model: "Model",
  apiKey: "API key",
  storedForTab: "Stored for this tab only",
  keyStorageHint:
    "Your key stays in session storage and is sent only when you request an edit.",
  saveModel: "Save model",
  describeOutcome:
    "Describe the outcome you want. I will edit the graph structure and keep the result reversible.",
  pendingEdit: "Reading structure and planning a safe edit…",
  appliedToCanvas: "Applied to canvas",
  checkModelSettings: "Check model settings",
  quickArchitecture: "Turn this into a clean three-tier architecture",
  quickFailure: "Add failure handling and a retry path",
  quickLayout: "Reduce crossings and improve the layout",
  promptPlaceholder: "Add a cache, split the payment flow, simplify the ER model…",
  describeChange: "Describe a diagram change",
  enterHint: "Enter to send · Shift+Enter for new line",
  sendRequest: "Send diagram request",
  aiEditFailed: "AI edit failed.",
  staleDiagram:
    "The diagram changed while AI was working. Review your latest edits and send the request again.",
  missingDiagram: "This diagram no longer exists.",
  diagramUpdated: "The diagram has been updated.",
  aiApplyFailed: "Could not apply AI edit.",
  mermaidSource: "Mermaid source",
  codeSyncHint: "Code stays synchronized with the visual model.",
  reset: "Reset",
  copied: "Copied",
  copy: "Copy",
  mermaidCode: "Mermaid code",
  renderedPreview: "Rendered preview",
  strictSecurity: "Strict security mode",
  syntaxValid: "Syntax preview is valid.",
  applyCanvas: "Apply to canvas",
  mermaidRenderFallback: "Mermaid could not render this source.",
  mermaidApplyFallback: "Could not apply Mermaid source.",
  diagramNode: "{{label}} diagram node",
} as const;

export type TranslationKey = keyof typeof englishMessages;
export type Locale = "en" | "zh";
export type TranslationValues = Record<string, string | number>;

const chineseMessages: Record<TranslationKey, string> = {
  loading: "正在准备图表工作区",
  diagramDirectory: "图表目录",
  diagramStudio: "图表工作台",
  newDiagram: "新建图表",
  architecture: "架构图",
  flowchart: "流程图",
  erDiagram: "ER 图",
  sequence: "时序图",
  workspace: "工作区",
  nodes: "{{count}} 个节点",
  duplicateCurrentDiagram: "复制当前图表",
  deleteCurrentDiagram: "删除当前图表",
  duplicate: "复制",
  delete: "删除",
  savedLocally: "已保存在此浏览器中。",
  saved: "已保存",
  diagramTitle: "图表标题",
  undo: "撤销",
  redo: "重做",
  editorView: "编辑视图",
  canvas: "画布",
  code: "代码",
  add: "添加",
  process: "处理",
  decision: "判断",
  database: "数据库",
  service: "服务",
  external: "外部系统",
  actor: "参与者",
  entity: "实体",
  arrange: "整理布局",
  switchLanguage: "切换语言",
  chinese: "中文",
  english: "EN",
  useDarkTheme: "使用深色主题",
  useLightTheme: "使用浅色主题",
  exporting: "正在导出",
  export: "导出",
  pngImage: "PNG 图片",
  twoXResolution: "2 倍分辨率",
  svgImage: "SVG 图片",
  scalableVector: "可缩放矢量",
  drawio: "draw.io",
  editableXml: "可编辑 XML",
  mermaid: "Mermaid",
  diagramAsCode: "图表代码",
  vibeJson: "Vibe JSON",
  canonicalSchema: "标准 Schema",
  diagramInspector: "图表属性",
  properties: "属性",
  ai: "AI",
  selectedNode: "已选节点",
  deleteSelectedNode: "删除已选节点",
  label: "名称",
  description: "描述",
  shape: "形状",
  accent: "强调色",
  toneAccent: "{{tone}}强调色",
  lilac: "淡紫",
  slate: "石板灰",
  cyan: "青色",
  amber: "琥珀",
  rose: "玫瑰",
  fields: "字段",
  fieldHint: "每行一个字段：类型 名称 约束",
  selectedConnection: "已选连接",
  deleteSelectedConnection: "删除已选连接",
  edgeLabelPlaceholder: "请求、发布、重试……",
  lineStyle: "连线样式",
  smoothstep: "平滑折线",
  straight: "直线",
  bezier: "贝塞尔曲线",
  animateDirection: "显示流向动画",
  selectNode: "选择一个节点",
  selectNodeHint: "点击画布中的节点即可编辑内容和样式。",
  vibeWithChart: "和图表一起 Vibe",
  configureModel: "配置模型",
  modelSettings: "模型设置",
  providerEndpoint: "服务商地址",
  model: "模型",
  apiKey: "API Key",
  storedForTab: "仅保存在当前标签页",
  keyStorageHint: "你的密钥只保存在会话存储中，仅在请求编辑时发送。",
  saveModel: "保存模型",
  describeOutcome: "描述你想要的结果，我会编辑图结构，并保留可撤销的修改。",
  pendingEdit: "正在读取结构并规划安全编辑……",
  appliedToCanvas: "已应用到画布",
  checkModelSettings: "请检查模型设置",
  quickArchitecture: "把它整理成清晰的三层架构",
  quickFailure: "补充故障处理和重试路径",
  quickLayout: "减少连线交叉并优化布局",
  promptPlaceholder: "添加缓存、拆分支付流程、简化 ER 模型……",
  describeChange: "描述要修改的图表",
  enterHint: "Enter 发送 · Shift+Enter 换行",
  sendRequest: "发送图表请求",
  aiEditFailed: "AI 编辑失败。",
  staleDiagram: "AI 工作期间图表发生了变化，请检查最新修改后重新发送请求。",
  missingDiagram: "此图表已不存在。",
  diagramUpdated: "图表已更新。",
  aiApplyFailed: "无法应用 AI 编辑。",
  mermaidSource: "Mermaid 源码",
  codeSyncHint: "代码会与可视化模型保持同步。",
  reset: "重置",
  copied: "已复制",
  copy: "复制",
  mermaidCode: "Mermaid 代码",
  renderedPreview: "渲染预览",
  strictSecurity: "严格安全模式",
  syntaxValid: "语法预览有效。",
  applyCanvas: "应用到画布",
  mermaidRenderFallback: "Mermaid 无法渲染此源码。",
  mermaidApplyFallback: "无法应用 Mermaid 源码。",
  diagramNode: "{{label}} 图表节点",
};

export const messages = {
  en: englishMessages,
  zh: chineseMessages,
} as const;

export function translate(
  locale: Locale,
  key: TranslationKey,
  values?: TranslationValues,
) {
  const template = messages[locale][key] ?? messages.en[key];
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = values?.[name];
    return value === undefined ? match : String(value);
  });
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem("vibe-chart-locale");
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // Private browsing can deny access to localStorage; use the browser hint.
  }
  return window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

const localeChangedEvent = "vibe-chart-locale-change";

function subscribeToLocale(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", callback);
  window.addEventListener(localeChangedEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localeChangedEvent, callback);
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getInitialLocale,
    (): Locale => "en",
  );
  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem("vibe-chart-locale", next);
    } catch {
      // The editor remains usable when persistence is unavailable.
    }
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    window.dispatchEvent(new Event(localeChangedEvent));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) =>
      translate(locale, key, values),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
