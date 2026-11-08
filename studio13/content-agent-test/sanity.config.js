import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { visionTool } from '@sanity/vision'

import { schemaTypes } from '../schemas'
import { structure } from '../deskStructure'

// This Studio has one workspace and must never target the production dataset.
export default defineConfig({
  name: 'content-agent-test',
  title: 'TEST ONLY — Content Agent',
  projectId: 'umy7f73e',
  dataset: 'content-agent-test',
  plugins: [deskTool({ structure }), visionTool()],
  schema: { types: schemaTypes },
})
