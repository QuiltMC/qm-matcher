# quirky matcher for qm

## prerequisites

In order to match, you must have [deno](https://deno.com/manual/getting_started/installation), [git](https://git-scm.com/downloads) and [java](https://adoptium.net/temurin/releases/) installed.

In this tutorial we'll be matching from `1.18` to `1.19` as examples. Note that if you're not a team member and don't have push access to the QM repo, you'll need to fork it and clone your fork instead.

## setup

0. Before you start, make sure you've merged all pull requests marked with `final-comment-period` in the QM repo!
1. Run `deno task setup [your old version] [your new version]`. For us, this means we'll run `deno task setup 1.18 1.19`.

You can also set up manually, see [manual setup](#manual-setup).

## matching

1. In both the old and new clones, run `./gradlew mapPerVersionMappingsJar`.
   - If you're seeing a "Could not resolve all files for configuration :hashed" error, it means that the [hashed](https://github.com/QuiltMC/mappings-hasher) publication is not yet released for the new minecraft version. This should normally happen automatically, but github will disable the automatic publishing if hashed has not seen activity in 60 days. In that case, go over to the [check and publish](https://github.com/QuiltMC/mappings-hasher/actions/workflows/check-and-publish.yml) action and reenable it. Manually trigger a run, and the hashed file should be available for your version in 2-3 minutes.
3. In the new clone, run `./gradlew dropInvalidMappings`.
4. Run `git add .` and `git commit -m "[your new version name]"` to commit. For us, this is `git commit -m "1.19"`.
5. Run `deno task match [your old version] [your new version]`. For us, this is `deno task match 1.18 1.19`.
6. In the new clone, run `./gradlew dropInvalidMappings` again.
7. Run `./gradlew generatePackageInfoMappings` to generate new package info files.
8. Run `./gradlew build javadocJar` to test your build.
9. Run `git add .` and `git commit -m "match [your new version name] to [your old version name]"` to commit. For us, this is `git commit -m "match 1.19 to 1.18"`.
10. Run `git push`, and you're done!

## post match

1. In the [github settings](https://github.com/QuiltMC/quilt-mappings/settings), update the default branch to the branch you just pushed.
2. Add the `update-base` label to all [pull requests](https://github.com/QuiltMC/quilt-mappings/pulls), excluding backports.

## manual setup

If the deno task fails, please report it and follow these steps to manually set up. You can also use this if you just don't trust the machines. We don't judge.

1. Clone this repo. We'll be calling the folder you cloned it into our `root` folder.
2. Enter your root folder.
3. Clone QM with `git clone https://github.com/quiltmc/quilt-mappings [your old version name]`. For us, this means we'll have a QM clone in a directory named `1.18`.
4. Repeat, this time naming the clone after your new version.
5. Go into your new version clone and update the `MINECRAFT_VERSION` constant in `buildSrc/src/main/java/quilt/internal/Constants.java` to match your current version.
6. Still in the new version clone, run `git checkout -b [your new version name]` to create a new branch for the new version. (`git checkout -b 1.19` for us)
7. Return to your root folder. You're ready to start matching!
