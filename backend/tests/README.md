# Backend Unit Tests

This directory contains comprehensive unit tests for the SentinelNet backend.

## Quick Start

Run all tests:
```bash
pytest backend/tests/ -v
```

## Test Files

### `test_auth.py` - Authentication Tests
Tests for API key validation and organization authentication.

**Key tests:**
- ✅ Valid API key authentication
- ✅ Invalid API key rejection
- ✅ Multi-org scenarios
- ✅ API key hashing and verification

### `test_services.py` - Service Tests
Tests for core business logic including incidents, campaigns, and query budget.

**Key tests:**

**Incidents:**
- ✅ Create new incident and assign to campaign
- ✅ Update existing incident via duplicate local_ref

**Campaigns:**
- ✅ K-anonymity enforcement (suppress sectors/regions when num_orgs < 2)
- ✅ Show data when num_orgs >= 2
- ✅ Privacy rule application

**Query Budget:**
- ✅ Budget decrement on query
- ✅ Exception when budget exhausted (429)
- ✅ Budget reset after reset time
- ✅ Progressive decrements

## Running Specific Tests

```bash
# Run a specific test class
pytest backend/tests/test_auth.py::TestGetCurrentOrg -v

# Run a specific test
pytest backend/tests/test_auth.py::TestGetCurrentOrg::test_get_current_org_valid_api_key -v

# Run tests matching a pattern
pytest backend/tests/ -k "budget" -v

# Run with coverage
pytest backend/tests/ --cov=backend --cov-report=html
```

## Test Structure

Each test follows the **Arrange-Act-Assert** pattern:

```python
def test_example(self, fixtures):
    # Arrange - set up test data
    data = create_test_data()
    
    # Act - call the function under test
    result = function_under_test(data)
    
    # Assert - verify the result
    assert result.is_valid
```

## Fixtures

All tests use pytest fixtures for setup and teardown:

- `test_db`: In-memory SQLite database (isolated per test)
- `test_org`: Pre-configured test organization
- `sample_incident_data`: Sample incident creation payload

## Test Results Summary

```
15 passed
- 5 authentication tests
- 10 service tests (2 incidents, 4 campaigns, 4 budget)
```

## Important Notes

1. **Isolation**: Each test uses its own in-memory SQLite database
2. **No Side Effects**: Tests do not modify production data
3. **Fast Execution**: In-memory databases make tests run quickly (~7s total)
4. **Privacy Testing**: K-anonymity rules are thoroughly tested with single and multi-org scenarios

## Continuous Integration

These tests should be run as part of the CI/CD pipeline to ensure code quality and prevent regressions.

```bash
# Recommended CI command
pytest backend/tests/ -v --tb=short --cov=backend
```
