import Callout from './Callout.astro';
import Card from './Card.astro';
import CardGrid from './CardGrid.astro';
import Demo from './Demo.astro';
import Playground from './Playground.astro';
import Pre from './Pre.astro';
import Tab from './Tab.astro';
import Tabs from './Tabs.astro';
import Template from './Template.astro';

/** What MDX pages get without importing: HTML overrides plus the doc components. */
export const mdxComponents = {
  pre: Pre,
  Callout,
  Card,
  CardGrid,
  Demo,
  Playground,
  Tab,
  Tabs,
  Template,
};
