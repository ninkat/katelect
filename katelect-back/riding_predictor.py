import json
import numpy as np
from typing import Dict, List, Optional
from pathlib import Path

class RidingPredictor:
    """predicts riding-level results using proportional swing from most recent election"""
    
    def __init__(self) -> None:
        # load national vote shares
        with open('data/results/federal_vote.json', 'r') as f:
            self.national_votes = json.load(f)
        
        # load riding-level results
        with open('data/results/federal_results.json', 'r') as f:
            self.provinces_data = json.load(f)
            
        # load latest polling averages
        with open('data/averages/federal_averages.json', 'r') as f:
            averages_data = json.load(f)
            # get the most recent poll
            latest_poll = averages_data[-1]
            self.latest_poll_date = latest_poll['date']
            self.latest_polls = {
                'LPC': latest_poll['liberal'],
                'CPC': latest_poll['conservative'],
                'NDP': latest_poll['ndp'],
                'BQ': latest_poll['bloc'],
                'GPC': latest_poll['green'],
                'PPC': latest_poll['ppc'],
                'Other': latest_poll['other']
            }
            
        # store the most recent results for each riding
        self.riding_history: Dict[str, Dict[str, float]] = {}
        self.most_recent_national: Dict[str, float] = {}
        
        # track which year's data we have for each riding
        self.riding_latest_year: Dict[str, str] = {}
        
        # store riding names
        self.riding_names: Dict[str, str] = {}
        
        # process historical data
        self._process_historical_data()
        
        # load all riding codes
        with open('data/districts/federal_districts.json', 'r') as f:
            districts_data = json.load(f)
            self.all_riding_codes = []
            for province in districts_data.values():
                for riding in province:
                    self.all_riding_codes.append(riding['code'])
    
    def _normalize_results(self, results: Dict[str, float], is_quebec: bool) -> Dict[str, float]:
        """normalize results to sum to 100% and handle special cases"""
        # if not quebec, remove BQ
        if not is_quebec:
            results['bq'] = 0.0
            
        # calculate current total (excluding 'other' as we'll use it for remainder)
        total = sum(results[p] for p in ['lpc', 'cpc', 'ndp', 'bq', 'gpc', 'ppc'])
        
        # if total exceeds 100%, normalize proportionally
        if total > 100.0:
            scale_factor = 100.0 / total
            for party in ['lpc', 'cpc', 'ndp', 'bq', 'gpc', 'ppc']:
                results[party] *= scale_factor
            results['other'] = 0.0
        else:
            # assign remainder to 'other'
            results['other'] = 100.0 - total
            
        return results
    
    def _process_historical_data(self) -> None:
        """process historical data to get most recent results for each riding"""
        # process in reverse chronological order to get most recent first
        for year in ['2021', '2019']:
            for province, ridings in self.provinces_data.items():
                for riding in ridings:
                    riding_code = riding['code']
                    
                    # store riding name if we haven't seen it yet
                    if riding_code not in self.riding_names:
                        self.riding_names[riding_code] = riding['name']
                    
                    if year in riding['results'] and riding_code not in self.riding_history:
                        # get raw results, defaulting to 0 for missing parties
                        results = {
                            party.lower(): riding['results'][year].get(party.lower(), 0)
                            for party in ['LPC', 'CPC', 'NDP', 'BQ', 'GPC', 'PPC', 'Other']
                        }
                        
                        # normalize results
                        is_quebec = riding_code.startswith('24')
                        normalized_results = self._normalize_results(results, is_quebec)
                        
                        # store normalized results
                        self.riding_history[riding_code] = normalized_results
                        self.riding_latest_year[riding_code] = year
                        
                        # if this is our first riding from this year, store national results
                        if not self.most_recent_national:
                            self.most_recent_national = {
                                party: self.national_votes[year][party]
                                for party in ['LPC', 'CPC', 'NDP', 'BQ', 'GPC', 'PPC', 'Other']
                            }
    
    def predict(self, riding_code: str, national_polls: Dict[str, float]) -> Dict[str, float]:
        """predict riding-level results using proportional swing from most recent election"""
        if riding_code not in self.riding_history:
            raise ValueError(f"No historical data available for riding {riding_code}")
        
        # get the riding's most recent results
        riding_results = self.riding_history[riding_code]
        is_quebec = riding_code.startswith('24')
        
        predictions = {}
        total = 0.0  # track total for normalization
        
        # calculate swing for each party
        for party in ['LPC', 'CPC', 'NDP', 'BQ', 'GPC', 'PPC', 'Other']:
            party_lower = party.lower()
            
            # handle BQ for non-Quebec ridings
            if party == 'BQ' and not is_quebec:
                predictions[party] = 0.0
                continue
            
            # get national values
            old_national = self.most_recent_national[party]
            new_national = national_polls[party]
            
            # calculate swing ratio (how much the party's support has changed nationally)
            if old_national == 0:
                swing_ratio = 1.0 if new_national > 0 else 0.0
            else:
                swing_ratio = new_national / old_national
            
            # apply swing to riding's result
            prediction = riding_results[party_lower] * swing_ratio
            predictions[party] = prediction
            total += prediction
        
        # normalize to ensure total is 100%
        if total > 0:
            for party in predictions:
                predictions[party] = (predictions[party] / total) * 100.0
        
        return predictions

if __name__ == '__main__':
    # initialize predictor
    predictor = RidingPredictor()
    
    # track seat counts and close races
    seat_counts = {
        'LPC': 0,
        'CPC': 0,
        'NDP': 0,
        'BQ': 0,
        'GPC': 0,
        'PPC': 0,
        'Other': 0
    }
    
    print(f"\nLatest National Polling Averages (as of {predictor.latest_poll_date}):")
    for party, support in sorted(predictor.latest_polls.items(), key=lambda x: x[1], reverse=True):
        print(f"{party}: {support:.1f}%")
    
    # predict results for all ridings
    for riding_code in predictor.all_riding_codes:
        try:
            predictions = predictor.predict(riding_code, predictor.latest_polls)
            
            # determine winner (party with highest vote share)
            winner = max(predictions.items(), key=lambda x: x[1])[0]
            seat_counts[winner] += 1
            
        except ValueError as e:
            print(f"Warning: Could not predict {riding_code}: {e}")
    
    # print final seat counts
    total_seats = sum(seat_counts.values())
    print("\nSeat Projections:")
    for party, seats in sorted(seat_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = (seats / total_seats) * 100 if total_seats > 0 else 0
        print(f"{party}: {seats} seats ({percentage:.1f}%)")
    
    print(f"\n[Total Seats: {total_seats}]")
    
    # determine if majority/minority
    if max(seat_counts.values()) > total_seats / 2:
        majority_party = max(seat_counts.items(), key=lambda x: x[1])[0]
        print(f"\n{majority_party} Majority Government")
    else:
        print("\nMinority Parliament") 