# Blackout USA

This is a prototype digital experience that allows students and others to learn about power system operations by interactively being introduced to various aspects of power system operations. The main learning objectives are:
* Learn about the types of electric generators (wind, solar, nuclear, gas, coal) and their differences.
* Learn about electric demand or "load" and balancing generation to load at all times.
* Learn about "reserves" and how to keep enough generating units running to prepare for future events.
* Learn about grid frequency, how it is controlled by the load-generation balance, and how loss of frequency control can lead to a blackout.
* Learn about transmission lines and how to control their loading levels to avoid cascading blackouts.
* Learn about cost considerations in operating a power grid.

For more information, see [https://birchfield.engr.tamu.edu/blackout-usa/](https://birchfield.engr.tamu.edu/blackout-usa/)

---


### Development

Prerequisites:
- Node.js 20+ (required by `wrangler`)
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


### Acknowledgments

This digital educational experience was developed by Adam Birchfield and Luke Lowery at Texas A&M University.

This material is based upon work supported in part by the National Science Foundation under Award No. 2442131. Any opinions, findings and conclusions or recommendations expressed in this material
are those of the author(s) and do not necessarily reflect the views of the National Science Foundation.
