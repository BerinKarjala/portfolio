export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Landing Page')
        .id('landingPage')
        .child(S.document().schemaType('landingPage').documentId('landingPage')),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (listItem) => listItem.getId() !== 'landingPage'
      ),
    ])
