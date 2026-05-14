# Blackout USA

This is a prototype digital experience that allows students and others to learn about power system operations by interactively being introduced to various aspects of power system operations. The main learning objectives are:
* Learn about the types of electric generators (wind, solar, nuclear, gas, coal) and their differences.
* Learn about electric demand or "load" and balancing generation to load at all times.
* Learn about "reserves" and how to keep enough generating units running to prepare for future events.
* Learn about grid frequency, how it is controlled by the load-generation balance, and how loss of frequency control can lead to a blackout.
* Learn about transmission lines and how to control their loading levels to avoid cascading blackouts.
* Learn about cost considerations in operating a power grid.

For more information, see [https://birchfield.engr.tamu.edu/blackout-usa/](https://birchfield.engr.tamu.edu/blackout-usa/)

This material is based upon work supported in part by the National Science Foundation under Award No. 2442131. Any opinions, findings and conclusions or recommendations expressed in this material
are those of the author(s) and do not necessarily reflect the views of the National Science Foundation.

---


### Development

Prerequisites:
- Node.js 22+ (required by `wrangler`)
- npm 10+
- Python 3 (for `npm run generate` / `npm run build`)

```bash
npm install          # install dependencies
npm run generate     # build grid data (requires Python, run once or after editing data/)
npm run dev          # start Vite dev server (http://localhost:5173)
npm run build        # static export to build/
npm run preview      # preview the build locally
npm run check        # run svelte-check for type errors
```

`npm run generate` runs `data/runme.py` which reads the case JSON files and writes `data/_out/`. You only need to re-run it when case data changes.

### Releases

GitHub builds releases from version tags. After final changes are on `main`, tag the release commit:

```bash
git tag v0.2.0      # replace with the next version
git push origin v0.2.0
```

Pushing a `v*.*.*` tag runs the `Release Build` workflow. It installs dependencies, checks the app, builds `build/`, and attaches `blackoutusa-<tag>.zip` to the GitHub Release.

### Acknowledgments

This digital educational experience was developed by Adam Birchfield and Luke Lowery at Texas A&M University.

Support from the US National Science Foundation (NSF) under award 2442131 is gratefully acknowledged.
