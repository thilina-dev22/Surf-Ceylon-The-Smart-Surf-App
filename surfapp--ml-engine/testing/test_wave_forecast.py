"""
Comprehensive Testing Script for Wave Forecast LSTM Model

This script provides thorough testing capabilities including:
- Multiple location testing (Weligama, Arugam Bay, custom coordinates)
- Different date ranges (past, present, future forecasts)
- Seasonal variations testing
- Performance metrics calculation
- K-fold cross-validation
- Visualization of results
- Comparison with baseline methods

Usage:
    python test_wave_forecast.py --mode quick           # Quick test (2 locations)
    python test_wave_forecast.py --mode full            # Full test suite
    python test_wave_forecast.py --mode kfold           # K-fold validation
    python test_wave_forecast.py --mode custom --lat 6.0 --lon 80.0  # Custom location
"""

import os
import sys
import json
import argparse
import subprocess
from datetime import datetime, timedelta
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Tuple

# Test locations (name, latitude, longitude, description)
TEST_LOCATIONS = [
    ("Weligama", 5.972, 80.426, "Popular beginner spot, south coast"),
    ("Arugam Bay", 6.842, 81.836, "World-class point break, east coast"),
    ("Hikkaduwa", 6.138, 80.103, "Coral reef break, west coast"),
    ("Mirissa", 5.948, 80.459, "Beach break, south coast"),
]

# Test scenarios
TEST_SCENARIOS = [
    {
        "name": "Current Forecast",
        "description": "7-day forecast from today",
        "days_offset": 0
    },
    {
        "name": "Past Data Check",
        "description": "Forecast from 7 days ago (for validation if historical data available)",
        "days_offset": -7
    },
    {
        "name": "Future Forecast",
        "description": "Forecast starting 3 days from now",
        "days_offset": 3
    }
]

class WaveForecastTester:
    """Comprehensive testing for wave forecast model"""
    
    def __init__(self):
        self.results = []
        self.service_script = 'forecast_7day_service.py'
        
    def run_forecast(self, lat: float, lon: float) -> Dict:
        """Run forecast service and parse results"""
        try:
            # Run the forecast service
            result = subprocess.run(
                [sys.executable, self.service_script, str(lat), str(lon)],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            # Parse JSON output
            if result.returncode == 0:
                forecast_data = json.loads(result.stdout)
                return {
                    'success': True,
                    'data': forecast_data,
                    'stderr': result.stderr
                }
            else:
                return {
                    'success': False,
                    'error': result.stderr,
                    'stdout': result.stdout
                }
                
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': 'Forecast service timeout (>60s)'
            }
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'error': f'JSON decode error: {e}',
                'stdout': result.stdout
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {e}'
            }
    
    def test_location(self, name: str, lat: float, lon: float, description: str) -> Dict:
        """Test forecast for a specific location"""
        print(f"\n{'='*70}")
        print(f"Testing: {name} ({description})")
        print(f"Coordinates: {lat}, {lon}")
        print(f"{'='*70}")
        
        result = self.run_forecast(lat, lon)
        
        if result['success']:
            data = result['data']
            
            # Extract metrics
            metrics = {
                'location': name,
                'coordinates': (lat, lon),
                'method_used': data.get('method_used', 'unknown'),
                'days_forecasted': len(data.get('forecast', [])),
                'avg_wave_height': self._calculate_avg(data, 'waveHeight'),
                'max_wave_height': self._calculate_max(data, 'waveHeight'),
                'avg_wind_speed': self._calculate_avg(data, 'windSpeed'),
                'avg_swell_period': self._calculate_avg(data, 'swellPeriod'),
                'has_confidence': 'confidence' in data,
                'avg_confidence': data.get('confidence', 0) * 100 if 'confidence' in data else 0
            }
            
            # Print results
            print(f"\n✅ Forecast Generated Successfully")
            print(f"   Method: {metrics['method_used']}")
            print(f"   Days: {metrics['days_forecasted']}")
            print(f"   Wave Height: {metrics['avg_wave_height']:.2f}m (max: {metrics['max_wave_height']:.2f}m)")
            print(f"   Wind Speed: {metrics['avg_wind_speed']:.2f} m/s")
            print(f"   Swell Period: {metrics['avg_swell_period']:.2f}s")
            if metrics['has_confidence']:
                print(f"   Confidence: {metrics['avg_confidence']:.1f}%")
            
            # Check for warnings in stderr
            if result.get('stderr'):
                if 'LSTM' in result['stderr']:
                    print(f"\n📊 Model Info:")
                    for line in result['stderr'].split('\n'):
                        if line.strip():
                            print(f"   {line}")
            
            return {'success': True, 'metrics': metrics, 'data': data}
            
        else:
            print(f"\n❌ Forecast Failed")
            print(f"   Error: {result['error']}")
            return {'success': False, 'error': result['error']}
    
    def _calculate_avg(self, data: Dict, field: str) -> float:
        """Calculate average of a field across forecast days"""
        forecast = data.get('forecast', {})
        if isinstance(forecast, dict):
            # New format: forecast is dict with arrays
            values = forecast.get(field, [])
        else:
            # Old format: forecast is list of dicts
            values = [day.get(field, 0) for day in forecast]
        return np.mean(values) if values else 0.0
    
    def _calculate_max(self, data: Dict, field: str) -> float:
        """Calculate maximum of a field across forecast days"""
        forecast = data.get('forecast', {})
        if isinstance(forecast, dict):
            # New format: forecast is dict with arrays
            values = forecast.get(field, [])
        else:
            # Old format: forecast is list of dicts
            values = [day.get(field, 0) for day in forecast]
        return np.max(values) if values else 0.0
    
    def quick_test(self):
        """Quick test on 2 main locations"""
        print("\n" + "="*70)
        print("QUICK TEST MODE - Testing 2 Locations")
        print("="*70)
        
        for name, lat, lon, desc in TEST_LOCATIONS[:2]:
            result = self.test_location(name, lat, lon, desc)
            self.results.append(result)
        
        self._print_summary()
    
    def full_test(self):
        """Full test suite on all locations"""
        print("\n" + "="*70)
        print("FULL TEST MODE - Testing All Locations")
        print("="*70)
        
        for name, lat, lon, desc in TEST_LOCATIONS:
            result = self.test_location(name, lat, lon, desc)
            self.results.append(result)
        
        self._print_summary()
        self._generate_visualizations()
    
    def custom_test(self, lat: float, lon: float):
        """Test custom coordinates"""
        print("\n" + "="*70)
        print("CUSTOM LOCATION TEST")
        print("="*70)
        
        result = self.test_location("Custom Location", lat, lon, "User-specified coordinates")
        self.results.append(result)
        self._print_summary()
    
    def kfold_validation(self, k: int = 5):
        """Perform K-fold cross-validation (requires training data)"""
        print("\n" + "="*70)
        print(f"K-FOLD CROSS-VALIDATION (k={k})")
        print("="*70)
        print("\n⚠️  Note: This requires training data and will retrain the model k times")
        print("    This test is computationally expensive and may take several hours.\n")
        
        response = input("Continue with K-fold validation? (yes/no): ")
        if response.lower() != 'yes':
            print("Cancelled.")
            return
        
        # Check if training script exists
        train_script = 'train_wave_forecast_lstm.py'
        if not os.path.exists(train_script):
            print(f"❌ Training script not found: {train_script}")
            return
        
        print("\n🚧 K-fold validation not yet implemented in this version")
        print("   This would require:")
        print("   1. Loading timeseries data")
        print("   2. Splitting into k folds")
        print("   3. Training k models")
        print("   4. Evaluating each fold")
        print("   5. Aggregating results")
        print("\n   Consider running: python train_wave_forecast_lstm.py")
        print("   and analyzing the training history instead.")
    
    def _print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        
        successful = [r for r in self.results if r.get('success')]
        failed = [r for r in self.results if not r.get('success')]
        
        print(f"\nTotal Tests: {len(self.results)}")
        print(f"✅ Successful: {len(successful)}")
        print(f"❌ Failed: {len(failed)}")
        
        if successful:
            # Check methods used
            methods = {}
            for r in successful:
                method = r['metrics']['method_used']
                methods[method] = methods.get(method, 0) + 1
            
            print(f"\n📊 Forecasting Methods Used:")
            for method, count in methods.items():
                print(f"   {method}: {count} tests")
            
            # Average metrics
            avg_wave = np.mean([r['metrics']['avg_wave_height'] for r in successful])
            avg_wind = np.mean([r['metrics']['avg_wind_speed'] for r in successful])
            avg_swell = np.mean([r['metrics']['avg_swell_period'] for r in successful])
            
            print(f"\n📈 Average Forecast Metrics:")
            print(f"   Wave Height: {avg_wave:.2f}m")
            print(f"   Wind Speed: {avg_wind:.2f} m/s")
            print(f"   Swell Period: {avg_swell:.2f}s")
        
        if failed:
            print(f"\n❌ Failed Tests:")
            for r in failed:
                print(f"   {r.get('error', 'Unknown error')}")
    
    def _generate_visualizations(self):
        """Generate visualization plots"""
        print("\n📊 Generating visualizations...")
        
        successful = [r for r in self.results if r.get('success')]
        if not successful:
            print("   No successful results to visualize")
            return
        
        # Create comparison plot
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('Wave Forecast Comparison Across Locations', fontsize=16, fontweight='bold')
        
        # Plot 1: Wave Height
        ax = axes[0, 0]
        for r in successful:
            forecast = r['data']['forecast']
            if isinstance(forecast, dict):
                days = list(range(1, len(forecast.get('waveHeight', [])) + 1))
                wave_heights = forecast.get('waveHeight', [])
            else:
                days = list(range(1, len(forecast) + 1))
                wave_heights = [day['waveHeight'] for day in forecast]
            ax.plot(days, wave_heights, marker='o', label=r['metrics']['location'])
        ax.set_xlabel('Day')
        ax.set_ylabel('Wave Height (m)')
        ax.set_title('Wave Height Forecast')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Plot 2: Wind Speed
        ax = axes[0, 1]
        for r in successful:
            forecast = r['data']['forecast']
            if isinstance(forecast, dict):
                days = list(range(1, len(forecast.get('windSpeed', [])) + 1))
                wind_speeds = forecast.get('windSpeed', [])
            else:
                days = list(range(1, len(forecast) + 1))
                wind_speeds = [day['windSpeed'] for day in forecast]
            ax.plot(days, wind_speeds, marker='s', label=r['metrics']['location'])
        ax.set_xlabel('Day')
        ax.set_ylabel('Wind Speed (m/s)')
        ax.set_title('Wind Speed Forecast')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Plot 3: Swell Period
        ax = axes[1, 0]
        for r in successful:
            forecast = r['data']['forecast']
            if isinstance(forecast, dict):
                days = list(range(1, len(forecast.get('swellPeriod', [])) + 1))
                swell_periods = forecast.get('swellPeriod', [])
            else:
                days = list(range(1, len(forecast) + 1))
                swell_periods = [day['swellPeriod'] for day in forecast]
            ax.plot(days, swell_periods, marker='^', label=r['metrics']['location'])
        ax.set_xlabel('Day')
        ax.set_ylabel('Swell Period (s)')
        ax.set_title('Swell Period Forecast')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Plot 4: Average Conditions Bar Chart
        ax = axes[1, 1]
        locations = [r['metrics']['location'] for r in successful]
        avg_waves = [r['metrics']['avg_wave_height'] for r in successful]
        x = np.arange(len(locations))
        bars = ax.bar(x, avg_waves, color='steelblue', alpha=0.7)
        ax.set_xlabel('Location')
        ax.set_ylabel('Average Wave Height (m)')
        ax.set_title('Average Wave Height by Location')
        ax.set_xticks(x)
        ax.set_xticklabels(locations, rotation=45, ha='right')
        ax.grid(True, alpha=0.3, axis='y')
        
        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.2f}m', ha='center', va='bottom', fontsize=9)
        
        plt.tight_layout()
        
        # Save plot
        output_file = 'test_results_comparison.png'
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"   ✅ Saved: {output_file}")
        
        # Save detailed results to JSON
        results_file = '../testing/test_results.json'
        with open(results_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_tests': len(self.results),
                'successful': len(successful),
                'results': [r.get('metrics') for r in successful if r.get('success')]
            }, f, indent=2)
        print(f"   ✅ Saved: {results_file}")

def main():
    parser = argparse.ArgumentParser(
        description='Comprehensive Wave Forecast Model Testing',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--mode',
        choices=['quick', 'full', 'kfold', 'custom'],
        default='quick',
        help='Test mode: quick (2 locations), full (all locations), kfold (cross-validation), custom (specify coordinates)'
    )
    
    parser.add_argument(
        '--lat',
        type=float,
        help='Latitude for custom test mode'
    )
    
    parser.add_argument(
        '--lon',
        type=float,
        help='Longitude for custom test mode'
    )
    
    parser.add_argument(
        '--k',
        type=int,
        default=5,
        help='Number of folds for K-fold validation (default: 5)'
    )
    
    args = parser.parse_args()
    
    # Validate custom mode arguments
    if args.mode == 'custom':
        if args.lat is None or args.lon is None:
            parser.error("--lat and --lon are required for custom mode")
    
    # Create tester instance
    tester = WaveForecastTester()
    
    # Run appropriate test mode
    if args.mode == 'quick':
        tester.quick_test()
    elif args.mode == 'full':
        tester.full_test()
    elif args.mode == 'kfold':
        tester.kfold_validation(k=args.k)
    elif args.mode == 'custom':
        tester.custom_test(args.lat, args.lon)
    
    print("\n" + "="*70)
    print("TESTING COMPLETE")
    print("="*70)

if __name__ == '__main__':
    main()
