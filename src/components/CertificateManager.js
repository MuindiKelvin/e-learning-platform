import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';

function CertificateManager({ user, userRole }) {
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, verified, rejected
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (user && userRole === 'admin') {
      loadData();
    }
  }, [user, userRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCertificates(),
        loadCourses()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading certificates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async () => {
    try {
      const certificatesQuery = query(
        collection(db, 'certificates'),
        orderBy('requestedAt', 'desc')
      );
      const snapshot = await getDocs(certificatesQuery);
      const certificatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCertificates(certificatesData);
    } catch (error) {
      console.error('Error loading certificates:', error);
      setCertificates([]);
    }
  };

  const loadCourses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    }
  };

  const generateCertificateNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `CERT-${timestamp}-${random}`;
  };

  const handleVerifyCertificate = async (certificateId) => {
    try {
      const certificateNumber = generateCertificateNumber();
      
      await updateDoc(doc(db, 'certificates', certificateId), {
        status: 'verified',
        verifiedBy: user.uid,
        verifiedAt: new Date(),
        certificateNumber: certificateNumber
      });
      
      await loadCertificates();
      setShowDetailsModal(false);
      setSelectedCertificate(null);
      
      alert('✅ Certificate verified successfully!');
    } catch (error) {
      console.error('Error verifying certificate:', error);
      alert('Error verifying certificate. Please try again.');
    }
  };

  const handleRejectCertificate = async (certificateId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      await updateDoc(doc(db, 'certificates', certificateId), {
        status: 'rejected',
        verifiedBy: user.uid,
        verifiedAt: new Date(),
        rejectionReason: rejectionReason
      });
      
      await loadCertificates();
      setShowDetailsModal(false);
      setSelectedCertificate(null);
      setRejectionReason('');
      
      alert('❌ Certificate rejected.');
    } catch (error) {
      console.error('Error rejecting certificate:', error);
      alert('Error rejecting certificate. Please try again.');
    }
  };

  const getFilteredCertificates = () => {
    if (filter === 'all') {
      return certificates;
    }
    return certificates.filter(cert => cert.status === filter);
  };

  const getCertificateStats = () => {
    return {
      total: certificates.length,
      pending: certificates.filter(c => c.status === 'pending').length,
      verified: certificates.filter(c => c.status === 'verified').length,
      rejected: certificates.filter(c => c.status === 'rejected').length
    };
  };

  const openCertificateDetails = (certificate) => {
    setSelectedCertificate(certificate);
    setShowDetailsModal(true);
  };

  if (userRole !== 'admin') {
    return (
      <div className="alert alert-warning">
        <h5>Access Denied</h5>
        <p>Only administrators can access certificate management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const stats = getCertificateStats();

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>🎓 Certificate Management</h2>
          <p className="text-muted mb-0">Verify and manage student certificates</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Requests</p>
                  <h3 className="mb-0">{stats.total}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <span style={{ fontSize: '2rem' }}>📜</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Pending</p>
                  <h3 className="mb-0">{stats.pending}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <span style={{ fontSize: '2rem' }}>⏳</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Verified</p>
                  <h3 className="mb-0">{stats.verified}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <span style={{ fontSize: '2rem' }}>✅</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Rejected</p>
                  <h3 className="mb-0">{stats.rejected}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded">
                  <span style={{ fontSize: '2rem' }}>❌</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            ⏳ Pending ({stats.pending})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${filter === 'verified' ? 'active' : ''}`}
            onClick={() => setFilter('verified')}
          >
            ✅ Verified ({stats.verified})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            ❌ Rejected ({stats.rejected})
          </button>
        </li>
      </ul>

      {/* Certificates Table */}
      <div className="card shadow-sm">
        <div className="card-body">
          {getFilteredCertificates().length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course</th>
                    <th>Completed Date</th>
                    <th>Requested Date</th>
                    <th>Status</th>
                    <th>Certificate Number</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredCertificates().map(certificate => (
                    <tr key={certificate.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                            <span>👤</span>
                          </div>
                          <div>
                            <strong>{certificate.studentName}</strong>
                            <br />
                            <small className="text-muted">{certificate.studentEmail}</small>
                          </div>
                        </div>
                      </td>
                      <td>{certificate.courseName}</td>
                      <td>
                        {certificate.completedAt?.toDate ? 
                          certificate.completedAt.toDate().toLocaleDateString() : 
                          'N/A'
                        }
                      </td>
                      <td>
                        {certificate.requestedAt?.toDate ? 
                          certificate.requestedAt.toDate().toLocaleDateString() : 
                          'N/A'
                        }
                      </td>
                      <td>
                        <span className={`badge ${
                          certificate.status === 'verified' ? 'bg-success' :
                          certificate.status === 'pending' ? 'bg-warning' : 'bg-danger'
                        }`}>
                          {certificate.status === 'verified' ? '✅ Verified' :
                           certificate.status === 'pending' ? '⏳ Pending' : '❌ Rejected'}
                        </span>
                      </td>
                      <td>
                        {certificate.certificateNumber ? (
                          <code className="small">{certificate.certificateNumber}</code>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openCertificateDetails(certificate)}
                        >
                          👁️ View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3" style={{ fontSize: '3rem' }}>🎓</div>
              <h5>No certificates found</h5>
              <p className="text-muted">
                {filter === 'all' 
                  ? 'No certificate requests yet' 
                  : `No ${filter} certificates`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Details Modal */}
      {showDetailsModal && selectedCertificate && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🎓 Certificate Details</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCertificate(null);
                    setRejectionReason('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {/* Certificate Preview */}
                <div className="border rounded p-4 mb-4" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="text-center mb-4">
                    <h3 className="text-primary mb-3">🎓 Certificate of Completion</h3>
                    <p className="text-muted mb-4">This certifies that</p>
                    <h2 className="mb-4">{selectedCertificate.studentName}</h2>
                    <p className="text-muted mb-3">has successfully completed the course</p>
                    <h4 className="text-primary mb-4">{selectedCertificate.courseName}</h4>
                    <div className="row justify-content-center mb-3">
                      <div className="col-md-6">
                        <p className="mb-1"><strong>Completion Date:</strong></p>
                        <p className="text-muted">
                          {selectedCertificate.completedAt?.toDate ? 
                            selectedCertificate.completedAt.toDate().toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 
                            'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    {selectedCertificate.certificateNumber && (
                      <div className="mt-4">
                        <small className="text-muted">Certificate Number:</small>
                        <p><code>{selectedCertificate.certificateNumber}</code></p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Information */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Student Email:</strong>
                    <p className="text-muted">{selectedCertificate.studentEmail}</p>
                  </div>
                  <div className="col-md-6">
                    <strong>Student ID:</strong>
                    <p className="text-muted">{selectedCertificate.studentId}</p>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Request Date:</strong>
                    <p className="text-muted">
                      {selectedCertificate.requestedAt?.toDate ? 
                        selectedCertificate.requestedAt.toDate().toLocaleString() : 
                        'N/A'
                      }
                    </p>
                  </div>
                  <div className="col-md-6">
                    <strong>Status:</strong>
                    <p>
                      <span className={`badge ${
                        selectedCertificate.status === 'verified' ? 'bg-success' :
                        selectedCertificate.status === 'pending' ? 'bg-warning' : 'bg-danger'
                      }`}>
                        {selectedCertificate.status}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedCertificate.status === 'verified' && (
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <strong>Verified By:</strong>
                      <p className="text-muted">{selectedCertificate.verifiedBy}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Verified Date:</strong>
                      <p className="text-muted">
                        {selectedCertificate.verifiedAt?.toDate ? 
                          selectedCertificate.verifiedAt.toDate().toLocaleString() : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {selectedCertificate.status === 'rejected' && selectedCertificate.rejectionReason && (
                  <div className="alert alert-danger">
                    <strong>Rejection Reason:</strong>
                    <p className="mb-0">{selectedCertificate.rejectionReason}</p>
                  </div>
                )}

                {selectedCertificate.status === 'pending' && (
                  <div className="mt-4">
                    <label className="form-label">Rejection Reason (optional if rejecting):</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide a reason if you want to reject this certificate..."
                    ></textarea>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCertificate(null);
                    setRejectionReason('');
                  }}
                >
                  Close
                </button>
                {selectedCertificate.status === 'pending' && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={() => handleRejectCertificate(selectedCertificate.id)}
                    >
                      ❌ Reject
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={() => handleVerifyCertificate(selectedCertificate.id)}
                    >
                      ✅ Verify & Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CertificateManager;