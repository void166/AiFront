import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createProject, getProjects, getProjectDetails, getUnassignedVideos,
  renameProject, deleteProject, moveVideo,
  type ProjectData, type ProjectVideo,
} from '@integration/projectApi';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import styles from './Projects.module.css';

type ActiveFolder = 'all' | string; // 'all' = unassigned

export function Projects() {
  const { token } = useAuth();

  const [projects,       setProjects]       = useState<ProjectData[]>([]);
  const [unassignedCount,setUnassignedCount] = useState(0);
  const [activeFolder,   setActiveFolder]   = useState<ActiveFolder>('all');
  const [videos,         setVideos]         = useState<ProjectVideo[]>([]);
  const [folderTitle,    setFolderTitle]     = useState('All Videos');
  const [loading,        setLoading]         = useState(false);

  const [showNewModal,   setShowNewModal]   = useState(false);
  const [newTitle,       setNewTitle]       = useState('');
  const [creating,       setCreating]       = useState(false);

  const [renamingId,     setRenamingId]     = useState<string | null>(null);
  const [renameVal,      setRenameVal]      = useState('');

  const [moveMenuVideo,  setMoveMenuVideo]  = useState<string | null>(null);
  const [playVideo,      setPlayVideo]      = useState<ProjectVideo | null>(null);
  const [moveError,      setMoveError]      = useState<string | null>(null);

  // ── Drag-and-drop state ──────────────────────────────────────────────────
  const [draggingVideo,  setDraggingVideo]  = useState<ProjectVideo | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<ActiveFolder | null>(null);
  const [dragPos,        setDragPos]        = useState<{ x: number; y: number } | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── Load sidebar folders ──────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      const { projects: ps, unassignedCount: uc } = await getProjects(token);
      setProjects(ps);
      setUnassignedCount(uc);
    } catch (err) {
      console.error('[Projects] loadProjects failed:', err);
    }
  }, [token]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // ── Load videos for selected folder ──────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const load = async () => {
      try {
        if (activeFolder === 'all') {
          const { videos: vs } = await getUnassignedVideos(token);
          setVideos(vs);
          setFolderTitle('All Videos');
        } else {
          const { project, videos: vs } = await getProjectDetails(activeFolder, token);
          setVideos(vs);
          setFolderTitle(project.title);
        }
      } catch { setVideos([]); }
      finally { setLoading(false); }
    };
    load();
  }, [activeFolder, token]);

  // ── Create project ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newTitle.trim() || !token) return;
    setCreating(true);
    try {
      await createProject(newTitle.trim(), token);
      await loadProjects();
      setShowNewModal(false);
      setNewTitle('');
    } catch {}
    finally { setCreating(false); }
  };

  // ── Rename ────────────────────────────────────────────────────────────────
  const startRename = (p: ProjectData) => {
    setRenamingId(p.id);
    setRenameVal(p.title);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };
  const commitRename = async () => {
    if (!renamingId || !renameVal.trim() || !token) { setRenamingId(null); return; }
    try {
      await renameProject(renamingId, renameVal.trim(), token);
      await loadProjects();
      if (activeFolder === renamingId) setFolderTitle(renameVal.trim());
    } catch {}
    setRenamingId(null);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!token || !confirm('Project устгах уу? Видеонууд "All Videos"-руу шилжнэ.')) return;
    try {
      await deleteProject(id, token);
      if (activeFolder === id) setActiveFolder('all');
      await loadProjects();
    } catch {}
  };

  // ── Move video to project ─────────────────────────────────────────────────
  const handleMove = async (videoId: string, projectId: string | null) => {
    if (!token) return;
    setMoveMenuVideo(null);
    try {
      await moveVideo(videoId, projectId, token);
      setVideos(v => v.filter(x => x.id !== videoId));
      await loadProjects();
    } catch (err: any) {
      setMoveError(err?.message ?? 'Зөөхөд алдаа гарлаа');
      setTimeout(() => setMoveError(null), 3000);
    }
  };

  // ── Drag-and-drop handlers ───────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, video: ProjectVideo) => {
    // Hide the default browser drag preview — we render our own
    const blankImg = new Image();
    blankImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(blankImg, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', video.id);
    setDraggingVideo(video);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    // Last drag event has clientX/Y = 0 — ignore that frame
    if (e.clientX === 0 && e.clientY === 0) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingVideo(null);
    setDragOverFolder(null);
    setDragPos(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: ActiveFolder) => {
    if (!draggingVideo) return;
    // Skip self-folder (already there)
    const currentFolder = draggingVideo.id && activeFolder; // current view
    if (folderId === currentFolder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  }, [draggingVideo, activeFolder]);

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, folderId: ActiveFolder) => {
    e.preventDefault();
    const video = draggingVideo;
    setDraggingVideo(null);
    setDragOverFolder(null);
    setDragPos(null);
    if (!video) return;
    // 'all' = unassigned (null), otherwise the project id
    const targetProjectId = folderId === 'all' ? null : folderId;
    await handleMove(video.id, targetProjectId);
  }, [draggingVideo, /* handleMove is stable enough */]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span style={{ fontSize: 24 }}>📁</span>
          <div>
            <div className={styles.headerTitle}>Projects</div>
            <div className={styles.headerSub}>{projects.length} folder{projects.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>Folders</div>

          {/* All Videos */}
          <div
            className={`${styles.folderItem} ${activeFolder === 'all' ? styles.active : ''} ${dragOverFolder === 'all' ? styles.folderDropOver : ''}`}
            onClick={() => setActiveFolder('all')}
            onDragOver={e => handleFolderDragOver(e, 'all')}
            onDragLeave={handleFolderDragLeave}
            onDrop={e => handleFolderDrop(e, 'all')}
          >
            <span className={styles.folderIcon}>🗂️</span>
            <span className={styles.folderName}>All Videos</span>
            <span className={styles.folderCount}>{unassignedCount}</span>
          </div>

          {/* Projects */}
          {projects.map(p => (
            <div
              key={p.id}
              className={`${styles.folderItem} ${activeFolder === p.id ? styles.active : ''} ${dragOverFolder === p.id ? styles.folderDropOver : ''}`}
              onClick={() => renamingId !== p.id && setActiveFolder(p.id)}
              onDragOver={e => handleFolderDragOver(e, p.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={e => handleFolderDrop(e, p.id)}
            >
              <span className={styles.folderIcon}>📂</span>

              {renamingId === p.id ? (
                <input
                  ref={renameInputRef}
                  className={styles.renameInput}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className={styles.folderName}>{p.title}</span>
              )}

              <span className={styles.folderCount}>{p.videoCount}</span>

              {renamingId !== p.id && (
                <span className={styles.folderActions} onClick={e => e.stopPropagation()}>
                  <button className={styles.actionBtn} title="Нэрийг өөрчлөх" onClick={() => startRename(p)}>✏️</button>
                  <button className={`${styles.actionBtn} ${styles.del}`} title="Устгах" onClick={() => handleDelete(p.id)}>🗑</button>
                </span>
              )}
            </div>
          ))}

          <button className={styles.newProjectBtn} onClick={() => setShowNewModal(true)}>
            <span>＋</span> New Folder
          </button>
        </aside>

        {/* ── Content ── */}
        <main className={styles.content} onClick={() => setMoveMenuVideo(null)}>
          <div className={styles.contentHeader}>
            <div className={styles.contentTitle}>
              {activeFolder !== 'all' && (
                <button
                  className={styles.backBtn}
                  onClick={e => { e.stopPropagation(); setActiveFolder('all'); }}
                  title="Back to All Videos"
                >
                  ← Back
                </button>
              )}
              <span>{activeFolder === 'all' ? '🗂️' : '📂'}</span>
              {folderTitle}
            </div>
            <span className={styles.contentCount}>{videos.length} видео</span>
          </div>

          {loading ? (
            <div className={styles.empty}><span className={styles.emptyIcon}>⏳</span><span className={styles.emptyText}>Уншиж байна...</span></div>
          ) : videos.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🎬</span>
              <span className={styles.emptyText}>Видео байхгүй байна</span>
              <span className={styles.emptyHint}>{activeFolder === 'all' ? 'Studio-оос видео үүсгэнэ үү' : 'Видеог энд зөөж болно'}</span>
            </div>
          ) : (
            <div className={styles.videoGrid}>
              {videos.map(v => (
                <VideoCard
                  key={v.id}
                  video={v}
                  projects={projects}
                  activeFolder={activeFolder}
                  showMenu={moveMenuVideo === v.id}
                  onToggleMenu={e => { e.stopPropagation(); setMoveMenuVideo(moveMenuVideo === v.id ? null : v.id); }}
                  onMove={handleMove}
                  onPlay={() => setPlayVideo(v)}
                  isDragging={draggingVideo?.id === v.id}
                  onDragStart={e => handleDragStart(e, v)}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── New project modal ── */}
      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>📁 New Folder</div>
            <input
              autoFocus
              className={styles.modalInput}
              placeholder="Folder name..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewModal(false); }}
            />
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowNewModal(false)}>Цуцлах</button>
              <button className={styles.btnCreate} onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                {creating ? 'Үүсгэж байна...' : 'Үүсгэх'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error toast ── */}
      {moveError && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          color: '#f87171', padding: '10px 20px', borderRadius: 10, zIndex: 300,
          fontSize: 14, fontWeight: 500, backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          ⚠️ {moveError}
        </div>
      )}

      {/* ── Video player ── */}
      {playVideo && (
        <VideoPlayerModal
          videoUrl={playVideo.final_video_url ?? ''}
          title={playVideo.title}
          onClose={() => setPlayVideo(null)}
        />
      )}

      {/* ── Floating drag preview (follows the cursor) ── */}
      {draggingVideo && dragPos && (
        <div
          className={styles.dragPreview}
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          {draggingVideo.thumbnail_url
            ? <img src={draggingVideo.thumbnail_url} alt="" />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, opacity: 0.4 }}>🎬</div>}
          <div className={styles.dragPreviewLabel}>{draggingVideo.title}</div>
        </div>
      )}
    </div>
  );
}

// ── VideoCard sub-component ──────────────────────────────────────────────────
interface CardProps {
  video: ProjectVideo;
  projects: ProjectData[];
  activeFolder: ActiveFolder;
  showMenu: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onMove: (videoId: string, projectId: string | null) => void;
  onPlay: () => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDrag:      (e: React.DragEvent) => void;
  onDragEnd:   () => void;
}

function VideoCard({
  video, projects, activeFolder, showMenu, onToggleMenu, onMove, onPlay,
  isDragging, onDragStart, onDrag, onDragEnd,
}: CardProps) {
  const statusClass =
    video.status === 'completed' ? styles.statusCompleted :
    video.status === 'failed'    ? styles.statusFailed    :
    styles.statusProcessing;

  const dur = video.duration ? `${Math.floor(video.duration / 60)}:${String(Math.round(video.duration % 60)).padStart(2, '0')}` : '';

  return (
    <div
      className={`${styles.videoCard} ${isDragging ? styles.videoCardDragging : ''}`}
      onClick={onPlay}
      draggable
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
    >
      <div className={styles.thumb}>
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} loading="lazy" />
          : <span className={styles.thumbPlaceholder}>🎬</span>}
        <div className={styles.thumbOverlay}>
          <span className={styles.playIcon}>▶️</span>
        </div>
      </div>

      <div className={styles.cardInfo}>
        <div className={styles.cardTitle}>{video.title}</div>
        <div className={styles.cardMeta}>
          <span className={`${styles.cardStatus} ${statusClass}`}>{video.status}</span>
          {dur && <span>{dur}</span>}

          {/* Move button */}
          <span
            style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: 14 }}
            title="Folder-руу зөөх"
            onClick={onToggleMenu}
          >↗️</span>
        </div>
      </div>

      {/* Move context menu */}
      {showMenu && (
        <div className={styles.moveMenu} onClick={e => e.stopPropagation()}>
          {activeFolder !== 'all' && (
            <>
              <div className={styles.moveMenuItem} onClick={() => onMove(video.id, null)}>
                🗂️ All Videos (зөөх)
              </div>
              <div className={styles.moveMenuSep} />
            </>
          )}
          {projects
            .filter(p => p.id !== activeFolder)
            .map(p => (
              <div key={p.id} className={styles.moveMenuItem} onClick={() => onMove(video.id, p.id)}>
                📂 {p.title}
              </div>
            ))}
          {projects.filter(p => p.id !== activeFolder).length === 0 && (
            <div className={styles.moveMenuItem} style={{ opacity: 0.5, cursor: 'default' }}>Folder байхгүй</div>
          )}
        </div>
      )}
    </div>
  );
}
