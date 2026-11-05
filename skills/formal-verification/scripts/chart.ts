import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

type TlaValue =
  boolean | number | string | TlaValue[] | { [key: string]: TlaValue };

type Variables = Record<string, TlaValue>;

interface ChartView {
  state: (variables: Variables) => string;
  step?: (
    action: string,
    from: Variables,
    to: Variables,
  ) => null | string | undefined;
  title?: string;
}

interface ModelState {
  isInitial: boolean;
  variables: Variables;
}

interface ModelStep {
  action: string;
  fromId: string;
  toId: string;
}

const usage = `Usage: node chart.ts <module>.tla --view <view.mjs> --out <dir> [--unit <dir>] [--spec <name>]

Draws the reachable states of a TLA+ model as a Mermaid chart and writes
chart.mmd and chart.html to <dir>. A view module names each state and step in
the reader's words.

--unit is the model's folder under verify/models/, and defaults to the module's
own folder. The script copies the unit's modules into <dir> and runs TLC there
with the compose.yaml in verify/models/, so a narrowing module kept outside the
repo can EXTEND the unit's spec.

The view module exports:
  state(variables)        the chart state that a model state belongs to, as a string
  step(action, from, to)  optional: the arrow's label, or null to hide the step
  title                   optional: a heading for the chart`;

const mermaidUrl =
  "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";

const busyArrowCount = 20;

function readDotString(text: string, start: number) {
  let value = "";
  let index = start + 1;

  while (index < text.length && text[index] !== '"') {
    if (text[index] === "\\") {
      const next = text[index + 1];

      value += next === "n" ? "\n" : (next ?? "");
      index += 2;
      continue;
    }

    value += text[index] ?? "";
    index += 1;
  }

  return { end: index + 1, value };
}

function parseTlaValue(source: string): TlaValue {
  let index = 0;

  function skipSpace() {
    while (/\s/.test(source[index] ?? "")) index += 1;
  }

  function expect(token: string) {
    skipSpace();

    if (!source.startsWith(token, index)) {
      throw new Error(`Expected ${token} at ${String(index)} in ${source}`);
    }

    index += token.length;
  }

  function readList(close: string) {
    const items: TlaValue[] = [];

    skipSpace();

    while (!source.startsWith(close, index)) {
      items.push(readValue());
      skipSpace();

      if (source[index] === ",") index += 1;

      skipSpace();
    }

    index += close.length;

    return items;
  }

  function readRecord() {
    const record: Record<string, TlaValue> = {};

    skipSpace();

    while (source[index] !== "]") {
      const key = /^\w+/.exec(source.slice(index))?.[0];

      if (!key)
        throw new Error(
          `Expected a field name at ${String(index)} in ${source}`,
        );

      index += key.length;
      expect("|->");
      record[key] = readValue();
      skipSpace();

      if (source[index] === ",") index += 1;

      skipSpace();
    }

    index += 1;

    return record;
  }

  function readString() {
    const end = source.indexOf('"', index + 1);
    const value = source.slice(index + 1, end);

    index = end + 1;

    return value;
  }

  function readWord() {
    const word = /^(TRUE|FALSE|-?\d+)/.exec(source.slice(index))?.[0];

    if (!word)
      throw new Error(
        `Cannot read a TLA+ value at ${String(index)} in ${source}`,
      );

    index += word.length;

    if (word === "TRUE") return true;
    if (word === "FALSE") return false;

    return Number(word);
  }

  const openers = [
    ["<<", () => readList(">>")],
    ["{", () => readList("}")],
    ["[", readRecord],
  ] as const;

  function readValue(): TlaValue {
    skipSpace();

    if (source[index] === '"') return readString();

    for (const [opener, read] of openers) {
      if (!source.startsWith(opener, index)) continue;

      index += opener.length;

      return read();
    }

    return readWord();
  }

  return readValue();
}

function parseVariables(label: string) {
  const variables: Variables = {};
  const assignments = label.trimStart().startsWith("/\\")
    ? label.split(/^\/\\ /m).filter((part) => part.trim() !== "")
    : [label];

  for (const assignment of assignments) {
    const separator = assignment.indexOf(" = ");

    variables[assignment.slice(0, separator).trim()] = parseTlaValue(
      assignment.slice(separator + 3),
    );
  }

  return variables;
}

function parseStateGraph(dot: string) {
  const states = new Map<string, ModelState>();
  const steps: ModelStep[] = [];

  for (const line of dot.split("\n")) {
    const edge = /^(-?\d+) -> (-?\d+) \[label="(\w+)"/.exec(line);

    if (edge) {
      const [, fromId = "", toId = "", action = ""] = edge;

      steps.push({ action, fromId, toId });
      continue;
    }

    const node = /^(-?\d+) \[label=/.exec(line);

    if (!node) continue;

    const labelStart = line.indexOf('"');
    const { end, value } = readDotString(line, labelStart);

    states.set(node[1] ?? "", {
      isInitial: line.slice(end).includes("style = filled"),
      variables: parseVariables(value),
    });
  }

  return { states, steps };
}

function escapeMermaid(text: string) {
  return text
    .replaceAll(":", "#58;")
    .replaceAll(";", "#59;")
    .replaceAll('"', "#quot;");
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

interface ChartNode {
  label: string;
  variables: Variables;
}

function groupStates(states: Map<string, ModelState>, view: ChartView) {
  const nodeById = new Map<string, ChartNode>();
  const chartIds = new Map<string, string>();
  const initialLabels = new Set<string>();

  for (const [id, { isInitial, variables }] of states) {
    const label = view.state(variables);

    nodeById.set(id, { label, variables });

    if (!chartIds.has(label)) chartIds.set(label, `s${String(chartIds.size)}`);
    if (isInitial) initialLabels.add(label);
  }

  return { chartIds, initialLabels, nodeById };
}

function labelStep(
  { action, fromId, toId }: ModelStep,
  nodeById: Map<string, ChartNode>,
  view: ChartView,
) {
  const from = nodeById.get(fromId);
  const to = nodeById.get(toId);

  if (!from || !to) {
    throw new Error(`The state graph names an unknown state on ${action}`);
  }

  if (from.label === to.label) return { kind: "loop" } as const;

  const stepLabel = view.step
    ? view.step(action, from.variables, to.variables)
    : action;

  if (stepLabel === null) return { kind: "hidden" } as const;

  return {
    key: JSON.stringify([from.label, to.label]),
    kind: "arrow",
    label: stepLabel ?? action,
  } as const;
}

function collectArrows(
  steps: ModelStep[],
  nodeById: Map<string, ChartNode>,
  view: ChartView,
) {
  const arrowLabels = new Map<string, Set<string>>();
  const counts = { arrow: 0, hidden: 0, loop: 0 };

  for (const modelStep of steps) {
    const step = labelStep(modelStep, nodeById, view);

    counts[step.kind] += 1;

    if (step.kind !== "arrow") continue;

    const labels = arrowLabels.get(step.key) ?? new Set<string>();

    labels.add(step.label);
    arrowLabels.set(step.key, labels);
  }

  return { arrowLabels, hiddenCount: counts.hidden, loopCount: counts.loop };
}

function renderMermaid(
  chartIds: Map<string, string>,
  initialLabels: Set<string>,
  arrowLabels: Map<string, Set<string>>,
) {
  const lines = ["stateDiagram-v2"];

  for (const [label, chartId] of chartIds)
    lines.push(`  ${chartId}: ${escapeMermaid(label)}`);
  for (const label of initialLabels)
    lines.push(`  [*] --> ${chartIds.get(label) ?? ""}`);

  for (const [key, labels] of arrowLabels) {
    const [fromLabel, toLabel] = JSON.parse(key) as [string, string];
    const text = escapeMermaid(
      [...labels]
        .toSorted((first, second) => first.localeCompare(second))
        .join(" or "),
    );

    lines.push(
      `  ${chartIds.get(fromLabel) ?? ""} --> ${chartIds.get(toLabel) ?? ""}: ${text}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function drawChart(graph: ReturnType<typeof parseStateGraph>, view: ChartView) {
  const { chartIds, initialLabels, nodeById } = groupStates(graph.states, view);
  const { arrowLabels, hiddenCount, loopCount } = collectArrows(
    graph.steps,
    nodeById,
    view,
  );

  return {
    arrowCount: arrowLabels.size,
    chartStateCount: chartIds.size,
    hiddenCount,
    loopCount,
    mermaid: renderMermaid(chartIds, initialLabels, arrowLabels),
  };
}

function renderPage(title: string, summary: string, mermaid: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { --bg: #fafaf8; --fg: #1c1c1c; --muted: #5f5f5f; --card: #ffffff; --border: #dedcd6; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #161616; --fg: #ececec; --muted: #a3a3a3; --card: #1f1f1f; --border: #333333; color-scheme: dark; } }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { font-size: 1.5rem; margin: 0 0 4px; }
p { color: var(--muted); margin: 0 0 24px; }
section { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; overflow-x: auto; }
.mermaid { display: flex; justify-content: center; }
.mermaid svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(summary)}</p>
<section><pre class="mermaid">
${escapeHtml(mermaid)}</pre></section>
</main>
<script type="module">
import mermaid from '${mermaidUrl}';
mermaid.initialize({ startOnLoad: true, theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'neutral' });
</script>
</body>
</html>
`;
}

interface ChartRun {
  modelPath: string;
  outDirectory: string;
  spec: string;
  unitDirectory: string;
  viewPath: string;
}

function readChartRun(): ChartRun | undefined {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: { short: "h", type: "boolean" },
      out: { type: "string" },
      spec: { default: "Spec", type: "string" },
      unit: { type: "string" },
      view: { type: "string" },
    },
  });
  const [modelFile] = positionals;

  if (!modelFile || values.help || !values.view || !values.out) {
    console.log(usage);
    process.exitCode = values.help ? 0 : 1;
    return;
  }

  const modelPath = path.resolve(modelFile);

  return {
    modelPath,
    outDirectory: path.resolve(values.out),
    spec: values.spec,
    unitDirectory: path.resolve(values.unit ?? path.dirname(modelPath)),
    viewPath: path.resolve(values.view),
  };
}

function stageModel({
  modelPath,
  outDirectory,
  spec,
  unitDirectory,
}: ChartRun) {
  const runDirectory = path.join(outDirectory, "model");

  mkdirSync(runDirectory, { recursive: true });

  for (const file of readdirSync(unitDirectory)) {
    if (!file.endsWith(".tla")) continue;

    copyFileSync(path.join(unitDirectory, file), path.join(runDirectory, file));
  }

  copyFileSync(modelPath, path.join(runDirectory, path.basename(modelPath)));
  writeFileSync(
    path.join(runDirectory, "chart.cfg"),
    `SPECIFICATION ${spec}\n`,
  );
}

function dumpStateGraph({ modelPath, outDirectory, unitDirectory }: ChartRun) {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      path.join(path.dirname(unitDirectory), "compose.yaml"),
      "run",
      "--rm",
      "-q",
      "-v",
      `${outDirectory}:/out`,
      "-w",
      "/out/model",
      "tlc",
      "-workers",
      "1",
      "-deadlock",
      "-metadir",
      "/tmp/tlc",
      "-dump",
      "dot,actionlabels",
      "/out/states",
      "-config",
      "chart.cfg",
      path.basename(modelPath),
    ],
    { encoding: "utf8", maxBuffer: 1 << 26 },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`TLC could not run\n${result.stdout}${result.stderr}`);
  }

  return parseStateGraph(
    readFileSync(path.join(outDirectory, "states.dot"), "utf8"),
  );
}

async function main() {
  const run = readChartRun();

  if (!run) return;

  const view = (await import(pathToFileURL(run.viewPath).href)) as ChartView;

  stageModel(run);

  const graph = dumpStateGraph(run);
  const chart = drawChart(graph, view);
  const title = view.title ?? path.basename(run.unitDirectory);
  const summary = `${String(graph.states.size)} model states and ${String(graph.steps.length)} steps, drawn as ${String(chart.chartStateCount)} states and ${String(chart.arrowCount)} arrows; ${String(chart.loopCount)} steps stay in one state and ${String(chart.hiddenCount)} are hidden by the view.`;
  const pagePath = path.join(run.outDirectory, "chart.html");

  writeFileSync(path.join(run.outDirectory, "chart.mmd"), chart.mermaid);
  writeFileSync(pagePath, renderPage(title, summary, chart.mermaid));

  console.log(`${summary}\n${pagePath}`);

  if (chart.arrowCount <= busyArrowCount) return;

  console.log(
    `A chart with more than ${String(busyArrowCount)} arrows is hard to read. Merge more states in state(), return null from step() for steps that every state shares, or chart one concern at a time through a module that EXTENDS the spec with a narrower Init or Next.`,
  );
}

await main();
