import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, removeAuthToken } from '../services/api';
import { 
  User, Activity, LogOut, FileText, ArrowLeft, Edit, Plus, Trash2, ShieldAlert, 
  Loader2, Info, Heart, AlertTriangle, Pill, Zap, CheckCircle2, XCircle
} from 'lucide-react';
import MedicalReviewRag from '../components/MedicalReviewRag';

export default function PatientDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [userRole, setUserRole] = useState<string>('');
  
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null); 
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [patientFormData, setPatientFormData] = useState<any>({});
  
  const [recordFormData, setRecordFormData] = useState({
    category: 'investigation',
    title: '',
    details: '',
    provider_name: 'Mock ABDM Sandbox'
  });

  const [operationError, setOperationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [u, p, r] = await Promise.all([
        api.getCurrentUser().catch(() => ({ role: 'UNKNOWN' })),
        api.getPatient(Number(id)),
        api.getPatientRecords(Number(id))
      ]);
      setUserRole(u.role);
      setPatient(p);
      setPatientFormData({ blood_group: p.blood_group || '', sex: p.sex || '' });
      setRecords(r);
    } catch (err: any) {
      if (err.message?.includes('403') || err.message === 'HTTP_403') {
        setError('Unauthorized: You do not have access to view this patient.');
      } else if (err.message?.includes('404') || err.message === 'HTTP_404') {
        setError('Patient or record not found.');
      } else if (err.message?.includes('503') || err.message?.includes('504') || err.message === 'HTTP_503' || err.message === 'HTTP_504') {
        setError('Medical record source is currently unavailable.');
      } else if (err.message === "401") {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Unable to reach ER Recall services. Check the network connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationError('');
    setIsSaving(true);
    try {
      await api.updatePatient(Number(id), patientFormData);
      setShowPatientModal(false);
      fetchData(); 
    } catch (err: any) {
      if (err.message?.includes('403')) {
        setOperationError('You are not authorized to perform this action.');
      } else if (err.message?.includes('503') || err.message?.includes('504')) {
        setOperationError('Medical record source is currently unavailable.');
      } else {
        setOperationError('Unable to reach ER Recall services. Check the network connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationError('');
    setIsSaving(true);
    try {
      if (currentRecord) {
        await api.updateRecord(currentRecord.id, recordFormData);
      } else {
        await api.createRecord(Number(id), recordFormData);
      }
      setShowRecordModal(false);
      setCurrentRecord(null);
      fetchData(); 
    } catch (err: any) {
      if (err.message?.includes('403')) {
        setOperationError('You are not authorized to perform this action.');
      } else if (err.message?.includes('503') || err.message?.includes('504')) {
        setOperationError('Medical record source is currently unavailable.');
      } else {
        setOperationError('Unable to reach ER Recall services. Check the network connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    setOperationError('');
    setIsSaving(true);
    try {
      await api.deleteRecord(recordId);
      setShowDeleteModal(null);
      fetchData();
    } catch (err: any) {
      if (err.message?.includes('403')) {
        setOperationError('You are not authorized to perform this action.');
      } else if (err.message?.includes('503') || err.message?.includes('504')) {
        setOperationError('Medical record source is currently unavailable.');
      } else {
        setOperationError('Unable to reach ER Recall services. Check the network connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openRecordModal = (record: any = null) => {
    if (record) {
      setCurrentRecord(record);
      setRecordFormData({
        category: record.category || 'investigation',
        title: record.title || '',
        details: record.details || '',
        provider_name: record.provider_name || 'Mock ABDM Sandbox'
      });
    } else {
      setCurrentRecord(null);
      setRecordFormData({
        category: 'investigation',
        title: '',
        details: '',
        provider_name: 'Mock ABDM Sandbox'
      });
    }
    setShowRecordModal(true);
  };

  const canEdit = userRole === 'DOCTOR' || userRole === 'ADMIN';
  const canDelete = userRole === 'ADMIN';

  // Extract critical information from records
  const allergies = records.filter(r => r.category === 'allergy');
  const medications = records.filter(r => r.category === 'medication');
  const surgeries = records.filter(r => r.category === 'surgery');
  const cardiacRecords = records.filter(r => r.category === 'investigation' && r.title?.toLowerCase().includes('card'));
  const conditions = records.filter(r => r.category === 'condition');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">Loading patient record...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-6">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-red-300 font-bold text-center mb-2">Error Loading Patient</h2>
            <p className="text-red-200/70 text-sm text-center mb-4">{error}</p>
            <button 
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      {/* Header */}
      <header className="bg-black/70 border-b border-red-900/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <h1 className="text-sm font-black text-white uppercase tracking-widest hidden sm:inline-block">
                ER RECALL
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-[10px] bg-green-900/40 text-green-300 border border-green-800/50 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                PATIENT VERIFIED
              </span>
              <span className="text-xs text-gray-400 font-mono">{patient.health_id}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-[10px] bg-gray-800 px-2.5 py-1 rounded text-gray-300 font-bold tracking-widest uppercase border border-gray-700">
                {userRole}
              </span>
              <span className="text-[10px] bg-blue-900/30 px-2.5 py-1 rounded-full text-blue-300 font-bold tracking-widest uppercase border border-blue-800/50">
                MOCK PROTOTYPE
              </span>
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors bg-gray-800/50 hover:bg-gray-800 px-3 py-2 rounded-lg border border-gray-700/50 hover:border-red-900/50"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline-block">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Operation Error Alert */}
      {operationError && (
        <div className="bg-red-950/40 border-b border-red-900/50 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-[1600px] mx-auto flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-200">{operationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Synthetic Data Warning */}
        <div className="flex items-start space-x-3 bg-blue-950/30 border border-blue-900/50 text-blue-200 px-4 py-3 rounded-lg mb-6">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed"><span className="font-bold uppercase tracking-wider text-blue-300">SYNTHETIC DATA:</span> All patient information and medical records are generated for demonstration purposes only.</p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Patient Info + Medical History */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* PATIENT VERIFIED Card */}
            <section className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-black/50 border-b border-red-900/50 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-xs font-black text-gray-100 uppercase tracking-widest">Patient Verified</h2>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name</p>
                  <p className="text-2xl font-black text-white tracking-tight">{patient.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Health ID</p>
                  <p className="text-sm text-gray-300 font-mono bg-gray-800/50 px-3 py-1.5 rounded border border-gray-700">{patient.health_id}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Blood Group</p>
                  <p className="text-2xl font-black text-red-500">{patient.blood_group || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">DOB / Sex</p>
                  <p className="text-sm text-gray-300">{patient.date_of_birth} <span className="text-gray-500">({patient.sex || '?'})</span></p>
                </div>
              </div>
            </section>

            {/* CRITICAL INFORMATION */}
            <section className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-black/50 border-b border-red-900/50 px-5 py-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="text-xs font-black text-gray-100 uppercase tracking-widest">Critical Information</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Allergies */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Allergies</span>
                  </div>
                  {allergies.length > 0 ? (
                    <div className="space-y-1.5 ml-6">
                      {allergies.map(r => (
                        <div key={r.id} className="text-sm text-gray-300 bg-red-950/20 border border-red-900/30 px-3 py-2 rounded">
                          {r.title} {r.details && <span className="text-gray-500 text-xs block mt-1">{r.details}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic ml-6">No allergies recorded</p>
                  )}
                </div>

                {/* Medications */}
                <div className="space-y-2 pt-3 border-t border-gray-800">
                  <div className="flex items-center space-x-2">
                    <Pill className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Current Medications</span>
                  </div>
                  {medications.length > 0 ? (
                    <div className="space-y-1.5 ml-6">
                      {medications.map(r => (
                        <div key={r.id} className="text-sm text-gray-300 bg-cyan-950/20 border border-cyan-900/30 px-3 py-2 rounded">
                          {r.title} {r.details && <span className="text-gray-500 text-xs block mt-1">{r.details}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic ml-6">No medications recorded</p>
                  )}
                </div>

                {/* Cardiac History */}
                {cardiacRecords.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-gray-800">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cardiac History</span>
                    </div>
                    <div className="space-y-1.5 ml-6">
                      {cardiacRecords.map(r => (
                        <div key={r.id} className="text-sm text-gray-300 bg-red-950/20 border border-red-900/30 px-3 py-2 rounded">
                          {r.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Surgeries */}
                {surgeries.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-gray-800">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Previous Surgeries</span>
                    </div>
                    <div className="space-y-1.5 ml-6">
                      {surgeries.map(r => (
                        <div key={r.id} className="text-sm text-gray-300 bg-yellow-950/20 border border-yellow-900/30 px-3 py-2 rounded">
                          {r.title} {r.details && <span className="text-gray-500 text-xs block mt-1">{r.details}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* MEDICAL HISTORY */}
            <section className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-black/50 border-b border-red-900/50 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xs font-black text-gray-100 uppercase tracking-widest">Medical History</h3>
                  <span className="bg-gray-800 text-gray-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-gray-700">
                    {records.length}
                  </span>
                </div>
                {canEdit && (
                  <button 
                    onClick={() => openRecordModal()}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 text-[10px] px-3 py-1.5 rounded-lg flex items-center font-bold transition-colors uppercase tracking-widest border border-red-900/50 hover:border-red-900"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
                  </button>
                )}
              </div>
              
              {records.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No medical records available.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
                  {records.map((record: any) => (
                    <div key={record.id} className="p-4 hover:bg-gray-900/50 transition-colors group border-l-2 border-l-transparent hover:border-l-red-500">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border
                              ${record.category === 'allergy' ? 'bg-red-950 text-red-200 border-red-800' : 
                                record.category === 'medication' ? 'bg-cyan-950 text-cyan-200 border-cyan-800' :
                                record.category === 'surgery' ? 'bg-purple-950 text-purple-200 border-purple-800' :
                                record.category === 'condition' ? 'bg-yellow-950 text-yellow-200 border-yellow-800' :
                                'bg-gray-800 text-gray-300 border-gray-700'}`}>
                              {record.category}
                            </span>
                            {record.recorded_date && (
                              <span className="text-[9px] text-gray-500">{new Date(record.recorded_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-gray-200">{record.title}</h4>
                          {record.details && <p className="text-xs text-gray-400 mt-1">{record.details.substring(0, 100)}{record.details.length > 100 ? '…' : ''}</p>}
                          <p className="text-[10px] text-gray-600 mt-2">{record.provider_name}</p>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {canEdit && (
                            <button 
                              onClick={() => openRecordModal(record)} 
                              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded border border-transparent hover:border-cyan-900/50 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => setShowDeleteModal(record.id)} 
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded border border-transparent hover:border-red-900/50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN: AI Medical Review */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <MedicalReviewRag patientId={Number(id)} />
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete Record?</h3>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteRecord(showDeleteModal)}
                disabled={isSaving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-lg w-full my-8">
            <h3 className="text-lg font-bold text-white mb-4">{currentRecord ? 'Edit' : 'Add'} Medical Record</h3>
            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Category</label>
                <select 
                  value={recordFormData.category}
                  onChange={(e) => setRecordFormData({ ...recordFormData, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-300 text-sm"
                >
                  <option value="allergy">Allergy</option>
                  <option value="medication">Medication</option>
                  <option value="surgery">Surgery</option>
                  <option value="condition">Condition</option>
                  <option value="investigation">Investigation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Title</label>
                <input 
                  type="text"
                  value={recordFormData.title}
                  onChange={(e) => setRecordFormData({ ...recordFormData, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-300 text-sm"
                  placeholder="Record title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Details</label>
                <textarea 
                  value={recordFormData.details}
                  onChange={(e) => setRecordFormData({ ...recordFormData, details: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-300 text-sm h-24"
                  placeholder="Additional details"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
