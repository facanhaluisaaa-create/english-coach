import { Fragment, type ReactNode } from "react";

/**
 * Minimal, dependency-free Markdown renderer for coach replies:
 * paragraphs, **bold**, *italic*, `code`, bullet/numbered lists, headings (as bold).
 * Everything is rendered as React nodes, never as raw HTML.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-coach">
      {blocks.map((block, i) => renderBlock(block.trim(), i))}
    </div>
  );
}

function renderBlock(block: string, key: number): ReactNode {
  if (!block) return null;
  const lines = block.split("\n");
  if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
    const ordered = /^\s*\d+[.)]/.test(lines[0]);
    const items = lines.map((l, i) => <li key={i}>{renderInline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>);
    return ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
  }
  if (/^#{1,6}\s/.test(block)) {
    return <p key={key}><strong>{renderInline(block.replace(/^#{1,6}\s+/, ""))}</strong></p>;
  }
  return (
    <p key={key}>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderInline(l)}
        </Fragment>
      ))}
    </p>
  );
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
