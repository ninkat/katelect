# Katelect

The **katelect** project is a Canadian federal election forecasting model and visualization tool.

## Getting Started

### Install required packages

```sh
npm install
```

### Starting the dev server

```sh
npm run dev
```

## Code Structure (src)

```sh
src
|
+-- app               # contains main application component
|
+-- assets            # images, svgs, etc.
|
+-- components        # shared components used across the entire application
|
+-- hooks             # shared hooks used across the entire application
|
+-- utils             # shared utility functions
```

### Current issues:
- electoral map's hover is broken
- pollmap needs to be updated to handle multiple polls on the same day

### Todo:
- bugfix then start getting all the real data for the backend
- train the model
- create a daily/weekly updating mechanism 