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

### Birchfield Research Group


### Project Structure

The React-based BlackoutUSA is split into two parts: visual, and logical.

#### Visual
The root webpage is defined in `app/page.tsx`, which uses custom components defined in `components/...` to keep the project maintanable. There is a unique file for each component of the game that theoretically one should be able to modify without needing to understand the whole project structure.

The folder `lib/game/canvas` is where the manual canvas input handling & drawing is managed. Since this is not technically a standard web component, it exists seperate from the rest of the visualization since it exists purely as an auxillary display of the game's information.



#### Logical

The actual engine of the game, including all states and logic, is in the `lib/game` folder.

The file `lib/engine.ts` defines the root of all game logic, and is where almost all states are managed. The file `lib/types` defines the data types that the application works with, and `lib/config.ts` contains various settings that change global parameters such as color.

The folder `lib/game/scenario` is where the scenario data is kept and where the sequence of events that define each scenario are defined.



### Development and Exporting Webpages

To run this in development environment, run the following in the repository root:

```bash
npm run dev
```

And to do a static export do a build:

```bash
npm run build
```

The static web files should then appear in `/out/...`


### Notes

#### Reminders
- In lightmode, it is hard to see the setpoint control for the units

#### Future Features
- After the last day, it goes back to day 1. Make a 'you finished' page.
- Forcast of load conditions would be cool as a hint, with feedback so you can see how scheduling startups impacts future
