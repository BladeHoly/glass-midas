import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const member = z.object({
  name: z.string(),
  type: z.string().optional(),
  default: z.string().optional(),
  description: z.string(),
});

export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      /** Position in its sidebar section. */
      order: z.number().default(99),
      /** Shorter title for the sidebar. */
      label: z.string().optional(),
      /** Component pages: the element, its attributes, properties, events and methods. */
      element: z.string().optional(),
      attributes: z.array(member).default([]),
      properties: z.array(member).default([]),
      events: z.array(member).default([]),
      methods: z.array(member).default([]),
    }),
  }),
};
