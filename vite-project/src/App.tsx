import React, { useState, useRef, useEffect } from 'react';
import { generateExamData } from './lib/examMaker';
import { createDocx } from './lib/documentGenerator';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import type { HistoryLog } from './lib/types';
import './index.css';

function App() {
  const [historyLog, setHistoryLog] = useState<HistoryLog>({});
  const [historyFileName, setHistoryFileName] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<Record<string, string[][]> | null>(null);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [examStatus, setExamStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedData, setGeneratedData] = useState<{ docxBlob: Blob, jsonBlob: Blob, totalQs: number } | null>(null);
  
  // Session Limits State
  const [startSession, setStartSession] = useState<string>('');
  const [endSession, setEndSession] = useState<string>('');
  const [availableSessions, setAvailableSessions] = useState<number[]>([]);

  // Admin Mode State
  const [adminPassword, setAdminPassword] = useState<string>(() => localStorage.getItem('adminPassword') || '1234');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminError, setAdminError] = useState<string>('');
  
  // Change Password State
  const [showChangePwModal, setShowChangePwModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [pwChangeError, setPwChangeError] = useState<string>('');

  const historyInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDefaultExcel = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}${encodeURIComponent('한국어문회 2급 준비.xlsx')}`);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const parsedData: Record<string, string[][]> = {};
        const sessions = new Set<number>();
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as string[][];
          parsedData[sheetName] = sheetData;
          
          if (sheetData.length > 2 && sheetName !== '프롬프트' && sheetName !== '빈출') {
            for (let i = 2; i < sheetData.length; i++) {
              if (sheetData[i].length > 1) {
                const sessionVal = parseInt(sheetData[i][1], 10);
                if (!isNaN(sessionVal)) sessions.add(sessionVal);
              }
            }
          }
        }
        
        setExcelData(parsedData);
        setExcelFileName("한국어문회 2급 준비.xlsx (기본 제공)");
        setAvailableSessions(Array.from(sessions).sort((a,b) => a - b));
      } catch (err) {
        console.error("기본 엑셀 파일 로드 실패:", err);
      }
    };
    loadDefaultExcel();
  }, []);

  const handleHistoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setHistoryLog(json);
        setHistoryFileName(file.name);
      } catch (err) {
        alert("잘못된 파일 형식입니다. 처음부터 다시 출제합니다.");
        setHistoryLog({});
      }
    };
    reader.readAsText(file);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const parsedData: Record<string, string[][]> = {};
        const sessions = new Set<number>();
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as string[][];
          parsedData[sheetName] = sheetData;
          
          if (sheetData.length > 2 && sheetName !== '프롬프트' && sheetName !== '빈출') {
            for (let i = 2; i < sheetData.length; i++) {
              if (sheetData[i].length > 1) {
                const sessionVal = parseInt(sheetData[i][1], 10);
                if (!isNaN(sessionVal)) sessions.add(sessionVal);
              }
            }
          }
        }
        
        setExcelData(parsedData);
        setExcelFileName(file.name);
        setAvailableSessions(Array.from(sessions).sort((a,b) => a - b));
      } catch (err) {
        alert("엑셀 파일 파싱 중 오류가 발생했습니다.");
        setExcelData(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleGenerate = async () => {
    if (!excelData) {
      setErrorMessage("원본 문제 은행 엑셀 파일을 업로드해주세요.");
      setExamStatus('error');
      return;
    }

    setExamStatus('loading');
    setErrorMessage('');
    setGeneratedData(null);

    try {
      const options = {
        startSession: startSession ? parseInt(startSession, 10) : undefined,
        endSession: endSession ? parseInt(endSession, 10) : undefined
      };
      const { examData, updatedHistory } = await generateExamData(excelData, historyLog, options);

      const totalItems = examData.reduce((acc, sec) => acc + sec.items.length, 0);
      if (totalItems === 0) {
        setErrorMessage("축하합니다! 문제 은행의 모든 문제를 다 푸셨습니다. 더 이상 새로운 문제가 없습니다.");
        setExamStatus('error');
        return;
      }

      const { doc, totalQs } = createDocx(examData);
      const docxBlob = await Packer.toBlob(doc);
      
      const jsonBlob = new Blob([JSON.stringify(updatedHistory, null, 2)], { type: 'application/json' });

      setGeneratedData({ docxBlob, jsonBlob, totalQs });
      setExamStatus('success');

    } catch (error: any) {
      setErrorMessage(`오류가 발생했습니다: ${error.message}`);
      setExamStatus('error');
    }
  };

  const downloadDocx = () => {
    if (!generatedData) return;
    const dateStr = new Date().toISOString().replace(/[:\-T]/g, '').slice(0, 13);
    saveAs(generatedData.docxBlob, `한자모의고사_${dateStr}.docx`);
  };

  const downloadJson = () => {
    if (!generatedData) return;
    saveAs(generatedData.jsonBlob, "exam_history.json");
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === adminPassword) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminPasswordInput('');
      setAdminError('');
    } else {
      setAdminError('암호가 틀렸습니다.');
    }
  };

  const toggleAdminMode = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      setShowAdminModal(true);
      setAdminPasswordInput('');
      setAdminError('');
    }
  };

  const handleChangePassword = () => {
    if (!newPassword || newPassword !== confirmNewPassword) {
      setPwChangeError('입력한 암호가 일치하지 않거나 비어있습니다.');
      return;
    }
    localStorage.setItem('adminPassword', newPassword);
    setAdminPassword(newPassword);
    setShowChangePwModal(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setPwChangeError('');
  };

  return (
    <div className="app-container">
      <div className="glass-card">
        <header className="header">
          <h1>📝 2급 한자 모의고사 생성기</h1>
          <p>
            이곳은 개인 맞춤형 한자 모의고사를 만들어주는 시스템입니다.<br/>
            <strong>기존에 풀었던 문제와 중복되지 않도록, 본인의 '세이브 파일(.json)'을 꼭 업로드해주세요!</strong>
            <br/>(처음 오신 분은 업로드 없이 바로 '모의고사 생성 시작'을 누르시면 됩니다.)
          </p>
          <div className="admin-actions">
            {isAdmin && (
              <button 
                className="icon-btn" 
                title="암호 변경" 
                onClick={() => setShowChangePwModal(true)}
              >
                🔑
              </button>
            )}
            <button 
              className="icon-btn" 
              title={isAdmin ? "관리자 모드 종료" : "관리자 로그인"} 
              onClick={toggleAdminMode}
            >
              {isAdmin ? '🔓' : '🔒'}
            </button>
          </div>
        </header>

        <div className="content">
          {isAdmin && (
            <div className="upload-container" onClick={() => excelInputRef.current?.click()} style={{ borderColor: excelFileName ? 'var(--primary-color)' : '' }}>
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                ref={excelInputRef} 
                onChange={handleExcelUpload} 
                style={{ display: 'none' }} 
              />
              {excelFileName ? (
                <div className="upload-success">
                  <span className="icon">📊</span>
                  <p>{excelFileName} 엑셀 로드 완료!</p>
                </div>
              ) : (
                <div className="upload-prompt">
                  <span className="icon">📊</span>
                  <p>원본 문제 은행 엑셀 파일 (.xlsx) 업로드<br/><span style={{ color: "var(--error-color)", fontSize: "0.85rem" }}>*필수</span></p>
                </div>
              )}
            </div>
          )}

          <div className="upload-container" onClick={() => historyInputRef.current?.click()} style={{ opacity: 0.8 }}>
            <input 
              type="file" 
              accept=".json" 
              ref={historyInputRef} 
              onChange={handleHistoryUpload} 
              style={{ display: 'none' }} 
            />
            {historyFileName ? (
              <div className="upload-success">
                <span className="icon">📄</span>
                <p>{historyFileName} 세이브 파일 로드 완료!</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <span className="icon">📂</span>
                <p>내 출제 기록 파일 (exam_history.json) 업로드<br/>(선택사항)</p>
              </div>
            )}
          </div>

          <div className="session-limits-container">
            <div className="session-input-wrapper">
              <label htmlFor="startSession">시작 회차</label>
              <select 
                id="startSession"
                value={startSession} 
                onChange={(e) => setStartSession(e.target.value)} 
              >
                <option value="">처음부터</option>
                {availableSessions.map(s => (
                  <option key={`start-${s}`} value={s}>{s}회</option>
                ))}
              </select>
            </div>
            <div className="session-divider">~</div>
            <div className="session-input-wrapper">
              <label htmlFor="endSession">종료 회차</label>
              <select 
                id="endSession"
                value={endSession} 
                onChange={(e) => setEndSession(e.target.value)}
              >
                <option value="">끝까지</option>
                {availableSessions.map(s => (
                  <option key={`end-${s}`} value={s}>{s}회</option>
                ))}
              </select>
            </div>
            
            <div className="session-summary-box">
              <span className="info-icon">💡</span>
              <p>
                <strong>선택된 출제 범위:</strong>{' '}
                {startSession || endSession ? (
                  <span className="highlight">
                    {startSession ? `${startSession}회` : '처음'} 부터 {endSession ? `${endSession}회` : '끝'} 까지
                  </span>
                ) : (
                  <span>전체 기출문제</span>
                )}
              </p>
            </div>
          </div>

          <button 
            className={`generate-btn ${examStatus === 'loading' ? 'loading' : ''}`}
            onClick={handleGenerate}
            disabled={examStatus === 'loading'}
          >
            {examStatus === 'loading' ? '⏳ 생성 중...' : '🚀 모의고사 생성 시작'}
          </button>

          {examStatus === 'error' && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          {examStatus === 'success' && generatedData && (
            <div className="success-section">
              <div className="success-message">
                🎉 총 {generatedData.totalQs}문항 출제가 완료되었습니다! 아래 두 파일을 모두 다운로드하세요.
              </div>
              <div className="download-buttons">
                <button className="download-btn primary" onClick={downloadDocx}>
                  📄 1. 문제지 다운로드 (.docx)
                </button>
                <div className="download-wrapper">
                  <button className="download-btn secondary" onClick={downloadJson}>
                    💾 2. 내 세이브 파일 다운로드 (.json)
                  </button>
                  <small>※ 다음 번 접속 시 이 파일을 꼭 업로드해주세요!</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🔒 관리자 암호 입력</h3>
            <p style={{ marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              엑셀 업로드 기능을 활성화하려면 암호를 입력하세요.
            </p>
            <input 
              type="password" 
              placeholder="암호 입력" 
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdminLogin();
              }}
              autoFocus
            />
            {adminError && <p style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '15px' }}>{adminError}</p>}
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowAdminModal(false)}>취소</button>
              <button className="modal-btn confirm" onClick={handleAdminLogin}>확인</button>
            </div>
          </div>
        </div>
      )}

      {showChangePwModal && (
        <div className="modal-overlay" onClick={() => setShowChangePwModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🔑 관리자 암호 변경</h3>
            <p style={{ marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              새로운 관리자 암호를 설정하세요. (초기: 1234)
            </p>
            <input 
              type="password" 
              placeholder="새 암호" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ marginBottom: '10px' }}
              autoFocus
            />
            <input 
              type="password" 
              placeholder="새 암호 확인" 
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChangePassword();
              }}
            />
            {pwChangeError && <p style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '15px' }}>{pwChangeError}</p>}
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => {
                setShowChangePwModal(false);
                setPwChangeError('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}>취소</button>
              <button className="modal-btn confirm" onClick={handleChangePassword}>변경 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
