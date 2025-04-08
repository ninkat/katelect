# Katelect Backend

The backend for the **katelect** project, handling poll aggregation and data serving for the Canadian federal election forecasting model.

## Getting Started

### Install required packages

```sh
pip install -r requirements.txt
```

### Updating poll data

To fetch new polls and update aggregations:

```sh
python scrape_polls.py  # scrapes new polls from 338canada
python aggregate_polls.py  # processes and aggregates the poll data
```

### Starting the server

```sh
uvicorn main:app --reload --port 8000
```

## Code Structure

```sh
katelect-back
|
+-- data              # contains all poll data
|   +-- polls         # raw poll data scraped from 338canada
|   +-- averages     # processed poll averages
|   +-- latest       # latest poll numbers and changes
|
+-- main.py          # fastapi server implementation
|
+-- scrape_polls.py  # poll scraping implementation
|
+-- aggregate_polls.py # poll processing and aggregation logic
```

### API Endpoints

- `/api/regions` - get list of available regions
- `/api/polls/{region}` - get raw polls for a region
- `/api/averages/{region}` - get averaged polls for a region
- `/api/latest/{region}` - get latest poll numbers and changes

### Data Processing

The backend handles three main tasks:

1. Scraping polls from 338canada for different regions
2. Processing and aggregating polls using EWMA (Exponentially Weighted Moving Average)
3. Serving processed data through a REST API

### Current issues:

- need to implement something that stops full rewrites of the data
- need to implement proper error handling for failed scrapes

### Todo:

- add logging
- implement automated daily updates
- add data validation
- add tests
