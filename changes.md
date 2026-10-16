# Round 1

## General

- Let's change "Maker" to "Brewer" across the entire app. More inline with coffee parlance.

## Admin

- Remove "Roaster" as a standalone option when adding/editing a shop. A coffee shop is either a Roaster and Brewer or a Brewer. Standalone roasters have their own area and should stay there.
- Let's remove the Latitude and Longitude fields from the Add/edit Shop page. Not sure it's actually that valuable and it really slows down the adding process
- The item list on the Option Lists page has a strange left padding or margin. There's also no need to show the "id" to the right of the textbox in each row. 
- It would be good to be able to edit the slug of a shop. Names do change, so this would be useful. The slug could be created by default when adding based on the name, but editing the slug should be available if the name changes.

## Visitor

- I'd say the filter box takes up too much vertical space on wide screens. I like the mobile approach, so perhaps that could be used? Filter button which expands the panel and the Area options to the right of it.
- When submitting a shop, Address or area isn't necessary. A Google Maps link should be required instead.
