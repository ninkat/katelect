import pandas as pd
import numpy as np
import json
import os
from pathlib import Path

# define directories
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data"
POLLS_DIR = DATA_DIR / "polls"
AVERAGES_DIR = DATA_DIR / "averages"
LATEST_DIR = DATA_DIR / "latest"

# ensure output directories exist
AVERAGES_DIR.mkdir(parents=True, exist_ok=True)
LATEST_DIR.mkdir(parents=True, exist_ok=True)

# parties and smoothing factor
PARTIES = ['liberal', 'conservative', 'ndp', 'bloc', 'green', 'ppc', 'other']
PARTY_MAP = {
    'LPC': 'liberal',
    'CPC': 'conservative',
    'NDP': 'ndp',
    'BQ': 'bloc',
    'GPC': 'green',
    'PPC': 'ppc',
}
SMOOTHING_FACTOR = 0.25 # alpha for ewma

def preprocess_polls(df: pd.DataFrame) -> pd.DataFrame:
    """
    preprocess the raw poll data.
    clean column names, convert types, handle missing values, and calculate 'other'.
    groups and averages polls by date before returning.
    skips polls that have empty strings for any party's vote share.

    args:
        df: dataframe with raw poll data.

    returns:
        preprocessed dataframe with one entry per date.
    """
    # rename columns for consistency
    df.rename(columns={
        'Date (middle)': 'date',
        'Polling Firm': 'pollster',
        'Firm': 'pollster', # handle alternative name
        'Sample': 'sampleSize'
    }, inplace=True)

    # ensure 'date' column exists
    if 'date' not in df.columns:
        raise ValueError("missing 'date' column")

    # convert date to datetime objects
    df['date'] = pd.to_datetime(df['date'])

    # convert sample size to numeric, removing commas and handling errors
    if 'sampleSize' in df.columns:
        df['sampleSize'] = df['sampleSize'].astype(str).str.replace(',', '', regex=False)
        df['sampleSize'] = pd.to_numeric(df['sampleSize'], errors='coerce').fillna(0).astype(int)
    else:
        df['sampleSize'] = 0 # add column if missing

    # create a mask to track rows with empty strings
    has_empty_strings = pd.Series(False, index=df.index)

    # map party acronyms and convert to numeric, tracking empty strings
    for acronym, party_key in PARTY_MAP.items():
        if acronym in df.columns:
            # mark rows where the value is an empty string
            has_empty_strings |= (df[acronym].astype(str).str.strip() == '')
            # convert to numeric, empty strings become nan
            df[party_key] = pd.to_numeric(df[acronym], errors='coerce')
        else:
            df[party_key] = 0 # add column if missing

    # remove rows that had empty strings
    df = df[~has_empty_strings].copy()

    # fill any remaining nan values with 0 (assign back instead of inplace)
    for party_key in PARTY_MAP.values():
        df[party_key] = df[party_key].fillna(0)

    # calculate 'other' party percentage
    party_cols = list(PARTY_MAP.values())
    df['total_parties'] = df[party_cols].sum(axis=1)
    df['other'] = np.maximum(0, 100 - df['total_parties'])

    # select necessary columns
    keep_cols = ['date', 'pollster', 'sampleSize'] + PARTIES
    df = df[keep_cols]

    # group by date and calculate weighted average based on sample size
    def weighted_average(group):
        weights = group['sampleSize']
        # if no sample sizes available, use simple average
        if weights.sum() == 0:
            weights = pd.Series(1, index=weights.index)

        result = {}
        # weighted average for each party
        for party in PARTIES:
            result[party] = np.average(group[party], weights=weights)
        # keep track of total sample size and pollsters for reference
        result['sampleSize'] = weights.sum()
        result['pollster'] = ', '.join(group['pollster'].unique())
        return pd.Series(result)

    # group by date and apply weighted average, silencing the deprecation warning
    # explicitly setting include_groups=false prepares for future pandas versions
    df = df.groupby('date').apply(weighted_average, include_groups=False).reset_index()

    # sort by date
    df.sort_values(by='date', inplace=True)
    df.reset_index(drop=True, inplace=True)

    return df

def calculate_ewma(series: pd.Series, alpha: float) -> pd.Series:
    """
    calculate exponentially weighted moving average.

    args:
        series: time series data for a single party.
        alpha: smoothing factor.

    returns:
        pandas series with ewma values.
    """
    # ensure we handle the first value correctly as in the original ts code
    # pandas ewm with adjust=false matches the formula:
    # new_ewma = previous_ewma + alpha * (current_value - previous_ewma)
    return series.ewm(alpha=alpha, adjust=False).mean()

def normalize_vote_share(df: pd.DataFrame) -> pd.DataFrame:
    """
    normalize vote shares for each party to sum to 100% for each date.

    args:
        df: dataframe with ewma values for each party.

    returns:
        dataframe with normalized vote shares.
    """
    df_normalized = df.copy()
    # calculate the total vote share for the parties we are tracking
    df_normalized['total'] = df_normalized[PARTIES].sum(axis=1)

    # avoid division by zero
    non_zero_total = df_normalized['total'] != 0

    # normalize each party's share
    for party in PARTIES:
        df_normalized.loc[non_zero_total, party] = (df_normalized.loc[non_zero_total, party] / df_normalized.loc[non_zero_total, 'total']) * 100

    # select only date and party columns
    df_normalized = df_normalized[['date'] + PARTIES]
    return df_normalized

def aggregate_polls():
    """
    main function to process all poll files.
    """
    print("starting poll aggregation...")
    for poll_file in POLLS_DIR.glob("polls_*.json"):
        region = poll_file.stem.split('_')[1]
        print(f"processing region: {region}...")

        try:
            with open(poll_file, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)

            if not raw_data:
                print(f"no data found for {region}, skipping.")
                continue

            df = pd.DataFrame(raw_data)
            df_processed = preprocess_polls(df)

            if df_processed.empty:
                print(f"no processable data after cleaning for {region}, skipping.")
                continue

            # calculate ewma for each party
            ewma_data = {'date': df_processed['date']}
            for party in PARTIES:
                ewma_data[party] = calculate_ewma(df_processed[party], SMOOTHING_FACTOR)

            df_ewma = pd.DataFrame(ewma_data)

            # normalize ewma data
            df_normalized = normalize_vote_share(df_ewma)

            # convert date back to string format yyyy-mm-dd for json
            df_normalized['date'] = df_normalized['date'].dt.strftime('%Y-%m-%d')

            # --- save averaged data ---
            averages_output_path = AVERAGES_DIR / f"{region}_averages.json"
            averages_data = df_normalized.to_dict(orient='records')
            with open(averages_output_path, 'w', encoding='utf-8') as f:
                json.dump(averages_data, f, indent=2, ensure_ascii=False)
            print(f"saved averaged data to {averages_output_path}")


            # --- calculate and save latest data and changes ---
            latest_values = {}
            changes = {}
            if len(df_normalized) >= 2:
                latest_row = df_normalized.iloc[-1]
                previous_row = df_normalized.iloc[-2]
                for party in PARTIES:
                    latest_values[party] = latest_row[party]
                    changes[party] = latest_row[party] - previous_row[party]
            elif len(df_normalized) == 1:
                 latest_row = df_normalized.iloc[-1]
                 for party in PARTIES:
                    latest_values[party] = latest_row[party]
                    changes[party] = None # no previous data to compare

            latest_data = {
                "latestValues": latest_values,
                "changes": changes
            }
            latest_output_path = LATEST_DIR / f"{region}_latest.json"
            with open(latest_output_path, 'w', encoding='utf-8') as f:
                json.dump(latest_data, f, indent=2, ensure_ascii=False)
            print(f"saved latest data to {latest_output_path}")

        except Exception as e:
            print(f"error processing {region}: {e}")

    print("poll aggregation finished.")

if __name__ == "__main__":
    aggregate_polls() 