# Unit Tests Coverage

This document describes the unit tests created for the SentinelNet backend.

## Test Files

### 1. `test_auth.py` (5 tests)

Tests for `backend/auth.py` - Authentication and API key verification.

#### Test Cases:

1. **`test_get_current_org_valid_api_key`**
   - Verifies that `get_current_org` successfully authenticates with a valid API key
   - Checks that the correct organization object is returned with all expected attributes
   - Status: ✅ PASS

2. **`test_get_current_org_invalid_api_key`**
   - Verifies that `get_current_org` raises `HTTPException` with 401 status for invalid API key
   - Confirms error detail message and WWW-Authenticate header are present
   - Status: ✅ PASS

3. **`test_get_current_org_with_multiple_orgs`**
   - Verifies that `get_current_org` correctly identifies the right organization among multiple orgs
   - Tests that the correct org's credentials are matched
   - Status: ✅ PASS

4. **`test_hash_and_verify_api_key`**
   - Verifies API key hashing and verification work correctly
   - Confirms hashed keys are different from plaintext and verification succeeds
   - Status: ✅ PASS

5. **`test_verify_api_key_invalid`**
   - Verifies that `verify_api_key` returns False for mismatched keys
   - Status: ✅ PASS

### 2. `test_services.py` (10 tests)

Tests for backend service functions: incidents, campaigns, and query budget.

#### Incident Service Tests (2 tests):

1. **`test_create_new_incident_and_assign_to_campaign`**
   - Verifies that `create_or_update_incident` creates a new incident with all expected fields
   - Confirms incident is automatically assigned to a new campaign
   - Checks campaign has correct `num_orgs` and `num_incidents` counts
   - Status: ✅ PASS

2. **`test_create_incident_with_duplicate_local_ref_updates_existing`**
   - Verifies that submitting an incident with the same `local_ref` updates the existing record
   - Confirms incident ID remains the same (not a new record)
   - Status: ✅ PASS

#### Campaign Service Tests (4 tests):

3. **`test_list_campaigns_apply_k_anonymity_single_org`**
   - Verifies that `list_campaigns` applies k-anonymity rules
   - Confirms sectors and regions are **suppressed** when campaign has `num_orgs < 2`
   - Status: ✅ PASS

4. **`test_list_campaigns_show_data_with_multiple_orgs`**
   - Verifies that sectors/regions are **shown** when campaign has `num_orgs >= 2`
   - Tests privacy rule behavior with multiple organizations
   - Status: ✅ PASS

5. **`test_apply_privacy_rules_suppresses_single_org`**
   - Verifies `apply_privacy_rules` suppresses sectors/regions for campaigns with `num_orgs < 2`
   - Status: ✅ PASS

6. **`test_apply_privacy_rules_shows_multiple_org_data`**
   - Verifies `apply_privacy_rules` shows sectors/regions for campaigns with `num_orgs >= 2`
   - Status: ✅ PASS

#### Query Budget Tests (4 tests):

7. **`test_decrement_budget_on_query`**
   - Verifies that `check_and_decrement_budget` decrements budget by 1
   - Status: ✅ PASS

8. **`test_raise_exception_when_budget_exhausted`**
   - Verifies that `check_and_decrement_budget` raises `HTTPException` with 429 status when budget is 0
   - Confirms error message mentions budget exhaustion
   - Status: ✅ PASS

9. **`test_budget_reset_when_reset_time_passed`**
   - Verifies budget resets to default (`DEFAULT_QUERY_BUDGET`) when reset time has passed
   - Confirms new reset time is set for next day
   - Status: ✅ PASS

10. **`test_multiple_decrements_reduce_budget_correctly`**
    - Verifies multiple calls to `check_and_decrement_budget` reduce budget progressively
    - Status: ✅ PASS

## Test Fixtures

### Shared Fixtures:

- **`test_db`**: Creates an in-memory SQLite database for isolated test execution
- **`test_org`**: Creates a test organization (org_alice) with pre-configured attributes
- **`sample_incident_data`**: Provides sample incident creation data for testing

## Test Results

```
15 passed in 7.10s
```

All test cases pass successfully with no errors.

## Running the Tests

```bash
# Run all tests
pytest backend/tests/test_auth.py backend/tests/test_services.py -v

# Run specific test class
pytest backend/tests/test_auth.py::TestGetCurrentOrg -v

# Run specific test
pytest backend/tests/test_auth.py::TestGetCurrentOrg::test_get_current_org_valid_api_key -v

# Run with coverage report
pytest backend/tests/ --cov=backend
```

## Coverage

The tests cover:

- ✅ Authentication flow with valid/invalid API keys
- ✅ Incident creation and campaign assignment
- ✅ Incident update via duplicate local_ref
- ✅ K-anonymity privacy rules (sector/region suppression)
- ✅ Query budget management (decrement, reset, exhaustion)
- ✅ API key hashing and verification utilities

## Notes

- Tests use in-memory SQLite databases for isolation
- Async tests use `pytest-asyncio` for proper async/await handling
- All fixtures provide clean state for each test
- Tests follow Arrange-Act-Assert pattern for clarity
