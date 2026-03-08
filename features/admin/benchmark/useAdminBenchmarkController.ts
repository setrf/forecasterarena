'use client';

import { useEffect, useState } from 'react';
import {
  createAdminBenchmarkConfig,
  createAdminBenchmarkRelease,
  fetchAdminBenchmarkOverview,
  promoteAdminBenchmarkConfig
} from '@/features/admin/benchmark/api';
import {
  buildConfigFormState,
  buildReleaseFormState
} from '@/features/admin/benchmark/constants';
import type {
  BenchmarkOverview,
  BenchmarkResultMessage,
  ConfigFormState,
  ReleaseFormState
} from '@/features/admin/benchmark/types';
import { loginAdmin, logoutAdmin } from '@/features/admin/dashboard/api';

export function useAdminBenchmarkController() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<BenchmarkOverview | null>(null);
  const [result, setResult] = useState<BenchmarkResultMessage | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [promotingConfigId, setPromotingConfigId] = useState<string | null>(null);
  const [releaseState, setReleaseState] = useState<ReleaseFormState>(buildReleaseFormState(null));
  const [configState, setConfigState] = useState<ConfigFormState | null>(null);

  async function loadOverview(preserveDrafts: boolean = true) {
    const nextOverview = await fetchAdminBenchmarkOverview();
    if (!nextOverview) {
      setIsAuthenticated(false);
      setOverview(null);
      setReleaseState(buildReleaseFormState(null));
      setConfigState(null);
      return null;
    }

    setIsAuthenticated(true);
    setOverview(nextOverview);
    setReleaseState((current) => {
      const nextReleaseState = buildReleaseFormState(nextOverview);
      const matchingFamily = nextOverview.families.find((family) => family.id === current.familyId);
      if (!preserveDrafts || !matchingFamily) {
        return nextReleaseState;
      }

      return {
        ...current,
        inputPricePerMillion: current.inputPricePerMillion || nextReleaseState.inputPricePerMillion,
        outputPricePerMillion: current.outputPricePerMillion || nextReleaseState.outputPricePerMillion
      };
    });
    setConfigState((current) => buildConfigFormState(nextOverview, preserveDrafts ? current : null));
    return nextOverview;
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateAdminSession() {
      try {
        const nextOverview = await fetchAdminBenchmarkOverview();
        if (cancelled) {
          return;
        }

        if (nextOverview) {
          setIsAuthenticated(true);
          setOverview(nextOverview);
          setReleaseState(buildReleaseFormState(nextOverview));
          setConfigState(buildConfigFormState(nextOverview));
        }
      } catch (fetchError) {
        console.error('Error restoring admin benchmark session:', fetchError);
      } finally {
        if (!cancelled) {
          setHasResolvedAuth(true);
        }
      }
    }

    void hydrateAdminSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loginResult = await loginAdmin(password);
      if (!loginResult.success) {
        setError(loginResult.error);
        return;
      }

      setIsAuthenticated(true);
      setHasResolvedAuth(true);
      await loadOverview(false);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutAdmin();
    setIsAuthenticated(false);
    setHasResolvedAuth(true);
    setPassword('');
    setOverview(null);
    setReleaseState(buildReleaseFormState(null));
    setConfigState(null);
  }

  function updateReleaseFamily(familyId: string) {
    setReleaseState((current) => {
      const family = overview?.families.find((item) => item.id === familyId);
      return {
        ...current,
        familyId,
        inputPricePerMillion: family?.current_input_price_per_million?.toString() ?? current.inputPricePerMillion,
        outputPricePerMillion: family?.current_output_price_per_million?.toString() ?? current.outputPricePerMillion
      };
    });
  }

  function updateConfigAssignment(
    familyId: string,
    updater: (assignment: NonNullable<ConfigFormState>['assignments'][number]) => NonNullable<ConfigFormState>['assignments'][number]
  ) {
    setConfigState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        assignments: current.assignments.map((assignment) => (
          assignment.familyId === familyId ? updater(assignment) : assignment
        ))
      };
    });
  }

  async function handleCreateRelease(event: React.FormEvent) {
    event.preventDefault();
    setReleaseLoading(true);
    setResult(null);

    try {
      const nextResult = await createAdminBenchmarkRelease(releaseState);
      setResult(nextResult);

      if (nextResult.type === 'success') {
        const nextOverview = await loadOverview(true);
        if (nextOverview) {
          setReleaseState(buildReleaseFormState(nextOverview));
        }
      }
    } catch {
      setResult({ type: 'error', message: 'Connection error' });
    } finally {
      setReleaseLoading(false);
    }
  }

  async function handleCreateConfig(event: React.FormEvent) {
    event.preventDefault();
    if (!configState) {
      return;
    }

    setConfigLoading(true);
    setResult(null);

    try {
      const nextResult = await createAdminBenchmarkConfig(configState);
      setResult(nextResult);

      if (nextResult.type === 'success') {
        const nextOverview = await loadOverview(false);
        if (nextOverview) {
          setConfigState(buildConfigFormState(nextOverview));
        }
      }
    } catch {
      setResult({ type: 'error', message: 'Connection error' });
    } finally {
      setConfigLoading(false);
    }
  }

  async function handlePromoteConfig(configId: string) {
    setPromotingConfigId(configId);
    setResult(null);

    try {
      const nextResult = await promoteAdminBenchmarkConfig(configId);
      setResult(nextResult);

      if (nextResult.type === 'success') {
        await loadOverview(true);
      }
    } catch {
      setResult({ type: 'error', message: 'Connection error' });
    } finally {
      setPromotingConfigId(null);
    }
  }

  return {
    password,
    isAuthenticated,
    hasResolvedAuth,
    error,
    loading,
    overview,
    result,
    releaseLoading,
    configLoading,
    promotingConfigId,
    releaseState,
    configState,
    setPassword,
    setReleaseState,
    setConfigState,
    handleLogin,
    handleLogout,
    updateReleaseFamily,
    updateConfigAssignment,
    handleCreateRelease,
    handleCreateConfig,
    handlePromoteConfig
  };
}
