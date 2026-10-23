import React, { useState, useEffect, useCallback } from 'react';
import {
  Navbar
} from './components/Navbar';
import {
  MetricsBar
} from './components/MetricsBar';
import {
  ProductList
} from './components/ProductList';
import {
  ProductModal
} from './components/ProductModal';
import {
  PriceHistoryModal
} from './components/PriceHistoryModal';
import {
  AlertsFeed
} from './components/AlertsFeed';
import {
  ApprovalsView
} from './components/ApprovalsView';
import {
  VerificationLogsView
} from './components/VerificationLogsView';
import {
  DatasetTestingView
} from './components/DatasetTestingView';
import {
  SimulationModal
} from './components/SimulationModal';

import {
  Product,
  PriceObservation,
  Alert,
  Approval,
  VerificationLog,
  DatasetStatus,
  TestCase,
  TestResult,
  MonitoringStatus,
} from './types';

import {
  fetchProducts,
  createProduct,
  deleteProduct,
  fetchProductHistory,
  fetchAlerts,
  muteAlert,
  resolveAlert,
  fetchApprovals,
  approveAction,
  rejectAction,
  fetchVerificationLogs,
  fetchDatasetStatus,
  reimportDataset,
  resetDatabase,
  fetchTestCases,
  fetchMonitoringStatus,
  runMonitoringSweep,
  runSingleCheck,
  simulateScenario,
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [datasetStatus, setDatasetStatus] = useState<DatasetStatus | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [checkingProductId, setCheckingProductId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<PriceObservation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [simulationModalResult, setSimulationModalResult] = useState<TestResult | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [
        prodsData,
        alertsData,
        approvalsData,
        logsData,
        dsStatusData,
        tcData,
        monStatusData,
      ] = await Promise.all([
        fetchProducts(),
        fetchAlerts(),
        fetchApprovals(),
        fetchVerificationLogs(),
        fetchDatasetStatus(),
        fetchTestCases(),
        fetchMonitoringStatus(),
      ]);

      setProducts(prodsData);
      setAlerts(alertsData);
      setApprovals(approvalsData);
      setLogs(logsData);
      setDatasetStatus(dsStatusData);
      setTestCases(tcData);
      setMonitoringStatus(monStatusData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Product actions
  const handleCreateProduct = async (payload: any) => {
    const newProd = await createProduct(payload);
    await loadAllData();
    showNotification(`Product '${newProd.name}' registered for tracking`, 'success');
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm(`Stop watching product ${productId}?`)) return;
    await deleteProduct(productId);
    await loadAllData();
    showNotification(`Removed product ${productId}`, 'info');
  };

  const handleOpenHistory = async (product: Product) => {
    setSelectedProductForHistory(product);
    setIsLoadingHistory(true);
    try {
      const hist = await fetchProductHistory(product.product_id);
      setProductHistory(hist);
    } catch (err: any) {
      showNotification('Failed to fetch history', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRunSingleCheck = async (productId: string) => {
    try {
      setCheckingProductId(productId);
      const res = await runSingleCheck(productId);
      await loadAllData();
      if (res.is_confirmed_drop) {
        showNotification(`Price drop confirmed for ${productId}! $${res.observed_price}`, 'success');
      } else {
        showNotification(`Check completed: ${res.decision} (${res.reason})`, 'info');
      }
    } catch (err: any) {
      showNotification('Failed to check product', 'error');
    } finally {
      setCheckingProductId(null);
    }
  };

  // Monitoring sweep
  const handleRunSweep = async () => {
    try {
      setIsScanning(true);
      const sweepRes = await runMonitoringSweep(false);
      await loadAllData();
      showNotification(
        `Sweep completed: ${sweepRes.scanned_count} scanned, ${sweepRes.drops_detected} confirmed drops`,
        'success'
      );
    } catch (err: any) {
      showNotification('Monitoring sweep failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Scenario simulation from Navbar or Test harness
  const handleSimulateScenario = async (testId: string): Promise<TestResult> => {
    const res = await simulateScenario(testId);
    setSimulationModalResult(res);
    await loadAllData();
    return res;
  };

  // Alert actions
  const handleMuteAlert = async (alertId: number) => {
    await muteAlert(alertId);
    await loadAllData();
    showNotification(`Alert #${alertId} muted`, 'info');
  };

  const handleResolveAlert = async (alertId: number) => {
    await resolveAlert(alertId);
    await loadAllData();
    showNotification(`Alert #${alertId} resolved`, 'success');
  };

  // Approval actions
  const handleApprove = async (approvalId: number, reason?: string) => {
    await approveAction(approvalId, reason);
    await loadAllData();
    showNotification(`Simulated cart reservation confirmed for APPR #${approvalId}!`, 'success');
  };

  const handleReject = async (approvalId: number, reason?: string) => {
    await rejectAction(approvalId, reason);
    await loadAllData();
    showNotification(`Simulated cart addition APPR #${approvalId} rejected`, 'info');
  };

  // Dataset actions
  const handleReimport = async () => {
    await reimportDataset();
    await loadAllData();
    showNotification('Synthetic dataset re-imported successfully', 'success');
  };

  const handleReset = async () => {
    if (!window.confirm('Reset database to clean synthetic demo state?')) return;
    await resetDatabase();
    await loadAllData();
    showNotification('Database reset to baseline demo state', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        status={monitoringStatus}
        testCases={testCases}
        onRunSweep={handleRunSweep}
        onSimulateScenario={(testId) => handleSimulateScenario(testId)}
        onReset={handleReset}
        isScanning={isScanning}
      />

      {/* Floating toast notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                : notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
                : 'bg-slate-900/90 text-slate-200 border-slate-700'
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Metrics Overview Bar */}
        <MetricsBar
          status={monitoringStatus}
          datasetStatus={datasetStatus}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Tab Content */}
        {isLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center text-slate-500 text-xs">
            Connecting to FastAPI & initializing SQLite database...
          </div>
        ) : (
          <>
            {activeTab === 'products' && (
              <ProductList
                products={products}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onOpenHistory={handleOpenHistory}
                onRunCheck={handleRunSingleCheck}
                onDeleteProduct={handleDeleteProduct}
                checkingProductId={checkingProductId}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsFeed
                alerts={alerts}
                onMuteAlert={handleMuteAlert}
                onResolveAlert={handleResolveAlert}
                onGoToApprovals={() => setActiveTab('approvals')}
              />
            )}

            {activeTab === 'approvals' && (
              <ApprovalsView
                approvals={approvals}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}

            {activeTab === 'logs' && (
              <VerificationLogsView
                logs={logs}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'dataset' && (
              <DatasetTestingView
                status={datasetStatus}
                testCases={testCases}
                onReimport={handleReimport}
                onReset={handleReset}
                onRunTest={(testId) => handleSimulateScenario(testId)}
              />
            )}
          </>
        )}
      </main>

      {/* Product Registration Modal */}
      <ProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProduct}
      />

      {/* Price History Modal */}
      <PriceHistoryModal
        product={selectedProductForHistory}
        history={productHistory}
        isLoading={isLoadingHistory}
        onClose={() => setSelectedProductForHistory(null)}
      />

      {/* Scenario Simulation Modal */}
      <SimulationModal
        result={simulationModalResult}
        onClose={() => setSimulationModalResult(null)}
        onGoToApprovals={() => setActiveTab('approvals')}
      />
    </div>
  );
}
