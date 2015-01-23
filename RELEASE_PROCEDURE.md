#Release procedure

##Addon
1. Update version in `package.json`.
2. Set `TabTrekkerConfig.dev` to `false`.
3. Turn off `TabTrekkerLogger` logging.
4. Update screenshots and addon description (if needed).

##API
1. In `tabtrekker/api`, run `parse deploy TabTrekkerProd`.
