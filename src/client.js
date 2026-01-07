import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: "umy7f73e",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
})

export const landingPageQuery = `*[_type == "landingPage" && isActive == true][0]{
  title,
  roleLabel,
  heroParagraph,
  heroSupportingLine,
  ctaLabel,
  ctaSubtext,
  coreStrengthsHeading,
  strengthGroups[]{heading, bullets[]},
  howIWorkHeading,
  howIWorkBody,
  currentlyOpenToHeading,
  currentlyOpenToBullets[]
}`

export const getLandingPage = () => sanityClient.fetch(landingPageQuery)

export default sanityClient
