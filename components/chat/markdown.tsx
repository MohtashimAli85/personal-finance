"use client";

import { type ComponentProps, createElement } from "react";
import { type Components, Streamdown } from "streamdown";
import "streamdown/styles.css";

const PLAIN_TAGS = [
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"p",
	"ul",
	"ol",
	"li",
	"blockquote",
	"strong",
	"em",
	"del",
	"hr",
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
	"pre",
	"code",
] as const;

type PlainProps = ComponentProps<"div"> & { node?: unknown };

const plainComponents = Object.fromEntries(
	PLAIN_TAGS.map((tag) => [
		tag,
		({ node: _node, ...props }: PlainProps) => createElement(tag, props),
	]),
) as Components;

const components: Components = {
	...plainComponents,
	a: ({ node: _node, ...props }: ComponentProps<"a"> & { node?: unknown }) => (
		<a {...props} target="_blank" rel="noreferrer" />
	),
};

export default function Markdown({
	text,
	isStreaming,
}: {
	text: string;
	isStreaming: boolean;
}) {
	return (
		<div className="typeset typeset-docs max-w-[42em]">
			<Streamdown
				components={components}
				mode={isStreaming ? "streaming" : "static"}
				isAnimating={isStreaming}
				controls={false}
			>
				{text}
			</Streamdown>
		</div>
	);
}
