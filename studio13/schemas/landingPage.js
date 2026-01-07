import { defineArrayMember, defineField, defineType } from 'sanity'

export default defineType({
  name: 'landingPage',
  title: 'Landing Page',
  type: 'document',
  initialValue: {
    title: 'Berin Karjala',
    roleLabel: 'Full-Stack Developer • QA-Minded Engineer • UX-Aware Builder',
    heroParagraph:
      'I design and build calm, reliable digital experiences rooted in clarity, structure, and long-term maintainability. My background spans software quality assurance, front-end development, and systems-focused problem solving, allowing me to bridge clean user interfaces with dependable technical foundations.',
    heroSupportingLine:
      'I focus on React-based front ends, content-driven platforms using Sanity, and thoughtful workflows that prioritize correctness, accessibility, and performance.',
    ctaLabel: 'Contact Me',
    ctaSubtext: 'Open to full-time and contract opportunities.',
    coreStrengthsHeading: 'Core Strengths',
    strengthGroups: [
      {
        heading: 'Frontend Engineering',
        bullets: [
          'React and modern JavaScript with a focus on clarity, consistency, and component reuse',
          'Layout systems that prioritize accessibility, responsiveness, and real-world usability',
        ],
      },
      {
        heading: 'Quality-Driven Development',
        bullets: [
          'QA-informed development mindset focused on verification, edge cases, and reliability',
          'Strong documentation habits and structured testing workflows',
        ],
      },
      {
        heading: 'Content & Systems Thinking',
        bullets: [
          'Sanity CMS modeling, content pipelines, and scalable page structures',
          'Experience translating business requirements into clean technical solutions',
        ],
      },
      {
        heading: 'Delivery & Operations',
        bullets: [
          'Reliable build, deployment, and workflow coordination',
          'Comfortable working across development, operations, and support-oriented roles',
        ],
      },
    ],
    howIWorkHeading: 'How I Work',
    howIWorkBody:
      'I bring a quality-first mindset shaped by years of working in structured, high-compliance environments. Whether I’m writing UI code, refining content models, or validating workflows, I focus on building systems that are calm, predictable, and easy to maintain.\n\nMy background in software QA, operations coordination, and technical support informs every development decision I make. I value clear communication, careful verification, and solutions that hold up over time.',
    currentlyOpenToHeading: 'Currently Open To',
    currentlyOpenToBullets: [
      'Full-time frontend or full-stack roles',
      'Contract or project-based web development',
      'Teams that value clarity, quality, and thoughtful execution',
    ],
    isActive: true,
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'roleLabel',
      title: 'Role Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroParagraph',
      title: 'Hero Paragraph',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroSupportingLine',
      title: 'Hero Supporting Line',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'ctaSubtext',
      title: 'CTA Subtext',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coreStrengthsHeading',
      title: 'Core Strengths Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'strengthGroups',
      title: 'Strength Groups',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'strengthGroup',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'bullets',
              title: 'Bullets',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              validation: (Rule) => Rule.required().min(2).max(2),
            }),
          ],
          preview: {
            select: {
              title: 'heading',
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(4).max(4),
    }),
    defineField({
      name: 'howIWorkHeading',
      title: 'How I Work Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'howIWorkBody',
      title: 'How I Work Body',
      type: 'text',
      rows: 6,
      description: 'Use a blank line to separate the two paragraphs.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'currentlyOpenToHeading',
      title: 'Currently Open To Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'currentlyOpenToBullets',
      title: 'Currently Open To Bullets',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(3),
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'updatedAtLabel',
      title: 'Updated At Label',
      type: 'string',
    }),
  ],
})
