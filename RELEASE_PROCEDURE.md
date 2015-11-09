#Release procedure

##Addon
1. Update version in `package.json`.
2. Set `TabTrekkerConfig.dev` to `false`.
3. Turn off `TabTrekkerLogger` logging.
4. Upload strings for translation and download latest translations.
5. Update changelog.
6. Update screenshots and addon description (if needed).
7. Build XPI `cfx xpi` and copy the XPI to `tabtrekker/releases`. Be sure to build the XPI on a Mac. Building on any other system will package with the wrong line endings.
8. Test on Mac and Windows machines.
9. Submit XPI to Mozilla Addons.
10. Commit release changes and XPI. Tag release commit. Rebase master to develop.

##API
1. In `tabtrekker/api`, update Parse command line tool by running `parse update`.
2. Run `parse deploy TabTrekkerProd`.
