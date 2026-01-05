import { createClient } from '@sanity/client'

export default createClient({
  projectId: "umy7f73e",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
})
