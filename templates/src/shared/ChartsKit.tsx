import { useEffect, useRef } from 'react';
import { barList, lineChart, sparkline, stackedColumns } from './charts.js';

// The charts for React: each one draws with charts.js (the same SVG, hover layer and table view
// as the HTML templates) into an element React leaves alone. Load charts.css once in your app.

type LineOptions = Parameters<typeof lineChart>[1];
type ColumnOptions = Parameters<typeof stackedColumns>[1];
type BarOptions = Parameters<typeof barList>[1];

/** Redraws when the options change; `key` is a string of what matters, so a new object with the same data doesn't. */
function useChart<O>(
  draw: (root: HTMLElement, options: O) => (() => void) | void,
  options: O,
  key: string,
) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    const stop = draw(ref.current!, latest.current);
    return () => {
      stop?.();
    };
  }, [draw, key]);
  return ref;
}

export function LineChart(props: LineOptions & { minHeight?: string }) {
  const ref = useChart(
    lineChart,
    props,
    JSON.stringify([props.labels, props.series, props.threshold, props.caption]),
  );
  return <div ref={ref} style={{ minHeight: props.minHeight ?? '17rem' }} />;
}

export function StackedColumns(props: ColumnOptions) {
  const ref = useChart(
    stackedColumns,
    props,
    JSON.stringify([props.labels, props.series, props.caption]),
  );
  return <div ref={ref} style={{ minHeight: '17rem' }} />;
}

export function BarList(props: BarOptions) {
  const ref = useChart(barList, props, JSON.stringify([props.rows, props.caption]));
  return <div ref={ref} />;
}

/** The shape of recent values, the last one marked. */
export function Sparkline({ values }: { values: number[] }) {
  return (
    <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: sparkline(values) }} />
  );
}
