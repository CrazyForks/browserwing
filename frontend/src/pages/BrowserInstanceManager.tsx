import { useState, useEffect } from 'react'
import { api, BrowserInstance } from '../api/client'
import { Plus, Power, PowerOff, Edit, Trash2, Settings, RefreshCw, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { useLanguage } from '../i18n'

export default function BrowserInstanceManager() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [instances, setInstances] = useState<BrowserInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingInstance, setEditingInstance] = useState<BrowserInstance | null>(null)
  const [message, setMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; instanceId: string | null }>({ 
    show: false, 
    instanceId: null 
  })
  const [currentInstanceId, setCurrentInstanceId] = useState<string>('')
  
  const [instanceForm, setInstanceForm] = useState({
    name: '',
    description: '',
    type: 'local' as 'local' | 'remote',
    bin_path: '',
    user_data_dir: '',
    control_url: '',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    use_stealth: null as boolean | null,
    headless: null as boolean | null,
    launch_args: [] as string[],
    proxy: '',
    is_default: false,
  })

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg)
    setToastType(type)
    setShowToast(true)
  }

  useEffect(() => {
    loadInstances()
    loadCurrentInstance()
  }, [])

  const loadInstances = async () => {
    try {
      setLoading(true)
      const response = await api.listBrowserInstances()
      setInstances(response.data.instances || [])
    } catch (err: any) {
      showMessage(t(err.response?.data?.error || 'browser.messages.loadError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentInstance = async () => {
    try {
      const response = await api.getCurrentBrowserInstance()
      if (response.data.instance) {
        setCurrentInstanceId(response.data.instance.id)
      }
    } catch (err) {
      // 没有当前实例，忽略错误
    }
  }

  const handleSaveInstance = async () => {
    if (!instanceForm.name.trim()) {
      showMessage(t('browser.instance.nameRequired'), 'error')
      return
    }

    if (instanceForm.type === 'local') {
      if (!instanceForm.user_data_dir.trim()) {
        showMessage(t('browser.instance.userDataDirRequired'), 'error')
        return
      }
    } else {
      if (!instanceForm.control_url.trim()) {
        showMessage(t('browser.instance.controlUrlRequired'), 'error')
        return
      }
    }

    try {
      if (editingInstance) {
        await api.updateBrowserInstance(editingInstance.id, instanceForm)
        showMessage(t('browser.instance.updateSuccess'), 'success')
      } else {
        await api.createBrowserInstance(instanceForm)
        showMessage(t('browser.instance.createSuccess'), 'success')
      }
      setShowModal(false)
      setEditingInstance(null)
      await loadInstances()
    } catch (err: any) {
      showMessage(t(err.response?.data?.error || 'browser.instance.saveError'), 'error')
    }
  }

  const handleDeleteInstance = async () => {
    if (!deleteConfirm.instanceId) return

    try {
      await api.deleteBrowserInstance(deleteConfirm.instanceId)
      showMessage(t('browser.instance.deleteSuccess'), 'success')
      await loadInstances()
    } catch (err: any) {
      showMessage(t(err.response?.data?.error || 'browser.instance.deleteError'), 'error')
    } finally {
      setDeleteConfirm({ show: false, instanceId: null })
    }
  }

  const handleStartInstance = async (id: string) => {
    try {
      await api.startBrowserInstance(id)
      showMessage(t('browser.instance.startSuccess'), 'success')
      await loadInstances()
      await loadCurrentInstance()
    } catch (err: any) {
      showMessage(t(err.response?.data?.error || 'browser.instance.startError'), 'error')
    }
  }

  const handleStopInstance = async (id: string) => {
    try {
      await api.stopBrowserInstance(id)
      showMessage(t('browser.instance.stopSuccess'), 'success')
      await loadInstances()
      await loadCurrentInstance()
    } catch (err: any) {
      showMessage(t(err.response?.data?.error || 'browser.instance.stopError'), 'error')
    }
  }

  const handleSwitchInstance = async (id: string) => {
    try {
      await api.switchBrowserInstance(id)
      showMessage(t('browser.instance.switchSuccess'), 'success')
      setCurrentInstanceId(id)
    } catch (err: any) {
      showMessage(t(err.response?.data?.error || 'browser.instance.switchError'), 'error')
    }
  }

  const openCreateModal = () => {
    setEditingInstance(null)
    setInstanceForm({
      name: '',
      description: '',
      type: 'local',
      bin_path: '',
      user_data_dir: '',
      control_url: '',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      use_stealth: null,
      headless: null,
      launch_args: [],
      proxy: '',
      is_default: false,
    })
    setShowModal(true)
  }

  const openEditModal = (instance: BrowserInstance) => {
    setEditingInstance(instance)
    setInstanceForm({
      name: instance.name,
      description: instance.description,
      type: instance.type,
      bin_path: instance.bin_path || '',
      user_data_dir: instance.user_data_dir || '',
      control_url: instance.control_url || '',
      user_agent: instance.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      use_stealth: instance.use_stealth ?? null,
      headless: instance.headless ?? null,
      launch_args: instance.launch_args || [],
      proxy: instance.proxy || '',
      is_default: instance.is_default,
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/browser')}
              className="btn-ghost p-2"
              title={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('browser.instance.title')}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadInstances}
              className="btn-ghost p-2"
              title={t('common.refresh')}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreateModal}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>{t('browser.instance.create')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instance List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {instances.map((instance) => (
          <div
            key={instance.id}
            className={`card ${instance.id === currentInstanceId ? 'ring-2 ring-gray-900 dark:ring-gray-100' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {instance.name}
                  </h3>
                  {instance.is_default && (
                    <span className="px-2 py-0.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-full">
                      {t('browser.instance.default')}
                    </span>
                  )}
                  {instance.id === currentInstanceId && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      {t('browser.instance.current')}
                    </span>
                  )}
                </div>
                {instance.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {instance.description}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('browser.instance.type')}:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      instance.type === 'local' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    }`}>
                      {t(`browser.instance.${instance.type}`)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('browser.instance.status')}:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      instance.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {instance.is_active ? t('browser.instance.running') : t('browser.instance.stopped')}
                    </span>
                  </div>
                  {instance.type === 'local' && instance.user_data_dir && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      <span className="font-medium">{t('browser.instance.userDataDir')}:</span> {instance.user_data_dir}
                    </div>
                  )}
                  {instance.type === 'remote' && instance.control_url && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      <span className="font-medium">{t('browser.instance.controlUrl')}:</span> {instance.control_url}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              {!instance.is_active ? (
                <button
                  onClick={() => handleStartInstance(instance.id)}
                  className="btn-secondary flex items-center space-x-2 flex-1"
                >
                  <Power className="w-4 h-4" />
                  <span>{t('browser.instance.start')}</span>
                </button>
              ) : (
                <>
                  {instance.id !== currentInstanceId && (
                    <button
                      onClick={() => handleSwitchInstance(instance.id)}
                      className="btn-secondary flex items-center space-x-2 flex-1"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t('browser.instance.switch')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleStopInstance(instance.id)}
                    className="btn-danger flex items-center space-x-2 flex-1"
                  >
                    <PowerOff className="w-4 h-4" />
                    <span>{t('browser.instance.stop')}</span>
                  </button>
                </>
              )}
              <button
                onClick={() => openEditModal(instance)}
                disabled={instance.is_active}
                className="btn-ghost p-2"
                title={t('browser.instance.edit')}
              >
                <Edit className="w-4 h-4" />
              </button>
              {!instance.is_default && !instance.is_active && (
                <button
                  onClick={() => setDeleteConfirm({ show: true, instanceId: instance.id })}
                  className="btn-ghost p-2 text-red-600 hover:bg-red-50"
                  title={t('browser.instance.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {instances.length === 0 && !loading && (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('browser.instance.noInstances')}
          </p>
          <button onClick={openCreateModal} className="btn-primary">
            {t('browser.instance.createFirst')}
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ marginTop: 0, marginBottom: 0 }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingInstance ? t('browser.instance.editTitle') : t('browser.instance.createTitle')}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingInstance(null)
                }}
                className="btn-ghost p-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* 基本信息 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('browser.instance.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={instanceForm.name}
                  onChange={(e) => setInstanceForm({ ...instanceForm, name: e.target.value })}
                  placeholder={t('browser.instance.namePlaceholder')}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('browser.instance.description')}
                </label>
                <textarea
                  value={instanceForm.description}
                  onChange={(e) => setInstanceForm({ ...instanceForm, description: e.target.value })}
                  placeholder={t('browser.instance.descriptionPlaceholder')}
                  rows={2}
                  className="input w-full"
                />
              </div>

              {/* 实例类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('browser.instance.type')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={instanceForm.type}
                  onChange={(e) => setInstanceForm({ ...instanceForm, type: e.target.value as 'local' | 'remote' })}
                  className="input w-full"
                >
                  <option value="local">{t('browser.instance.local')}</option>
                  <option value="remote">{t('browser.instance.remote')}</option>
                </select>
              </div>

              {/* 本地模式配置 */}
              {instanceForm.type === 'local' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('browser.instance.binPath')}
                    </label>
                    <input
                      type="text"
                      value={instanceForm.bin_path}
                      onChange={(e) => setInstanceForm({ ...instanceForm, bin_path: e.target.value })}
                      placeholder={t('browser.instance.binPathPlaceholder')}
                      className="input w-full font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('browser.instance.binPathHint')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('browser.instance.userDataDir')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={instanceForm.user_data_dir}
                      onChange={(e) => setInstanceForm({ ...instanceForm, user_data_dir: e.target.value })}
                      placeholder={t('browser.instance.userDataDirPlaceholder')}
                      className="input w-full font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('browser.instance.userDataDirHint')}
                    </p>
                  </div>
                </>
              )}

              {/* 远程模式配置 */}
              {instanceForm.type === 'remote' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('browser.instance.controlUrl')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={instanceForm.control_url}
                    onChange={(e) => setInstanceForm({ ...instanceForm, control_url: e.target.value })}
                    placeholder={t('browser.instance.controlUrlPlaceholder')}
                    className="input w-full font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('browser.instance.controlUrlHint')}
                  </p>
                </div>
              )}

              {/* 高级配置（可选） */}
              <div className="border-t dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('browser.instance.advancedSettings')}
                </h4>
                
                {/* Proxy */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('browser.config.proxy')}
                  </label>
                  <input
                    type="text"
                    value={instanceForm.proxy}
                    onChange={(e) => setInstanceForm({ ...instanceForm, proxy: e.target.value })}
                    placeholder={t('browser.config.proxyPlaceholder')}
                    className="input w-full"
                  />
                </div>

                {/* Headless */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('browser.config.headlessMode')}
                  </label>
                  <select
                    value={instanceForm.headless === null ? 'default' : (instanceForm.headless ? 'enabled' : 'disabled')}
                    onChange={(e) => {
                      const value = e.target.value
                      setInstanceForm({
                        ...instanceForm,
                        headless: value === 'default' ? null : value === 'enabled'
                      })
                    }}
                    className="input w-full"
                  >
                    <option value="default">{t('browser.config.headlessDefault')}</option>
                    <option value="enabled">{t('browser.config.headlessEnabled')}</option>
                    <option value="disabled">{t('browser.config.headlessDisabledOption')}</option>
                  </select>
                </div>
              </div>

              {/* 设为默认 */}
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instanceForm.is_default}
                    onChange={(e) => setInstanceForm({ ...instanceForm, is_default: e.target.checked })}
                    className="w-4 h-4 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-900 dark:focus:ring-gray-100"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('browser.instance.setAsDefault')}
                  </span>
                </label>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingInstance(null)
                  }}
                  className="btn-ghost"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveInstance}
                  className="btn-primary"
                >
                  {editingInstance ? t('common.update') : t('common.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm.show && (
        <ConfirmDialog
          title={t('browser.instance.deleteConfirm')}
          message={t('browser.instance.deleteMessage')}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          onConfirm={handleDeleteInstance}
          onCancel={() => setDeleteConfirm({ show: false, instanceId: null })}
        />
      )}

      {/* Toast */}
      {showToast && (
        <Toast
          message={message}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
