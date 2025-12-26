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

To run this in development environment, run the following in this directory

```bash
npm run dev
```

And to do a static export do a build:

```bash
npm run build
```

The static web files should then appear in `/blackoutusa/out/...`

