import MapViewer from '../../ui/Map/MapViewer';
import Button from '../../ui/Button/Button';
import { X } from 'lucide-react';
import './MapDirectionsModal.css';

export default function MapDirectionsModal({
    isOpen,
    onClose,
    providerPos,
    clientPos,
    clientName,
    providerName = "Your Office"
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay modal-overlay--visible" onClick={onClose}>
            <div className="modal-content map-directions-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Route to Client</h2>
                        <p className="modal-subtitle">Showing path from {providerName} to {clientName}</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <MapViewer
                        lat={clientPos.lat}
                        lng={clientPos.lng}
                        label={clientName}
                        originLat={providerPos.lat}
                        originLng={providerPos.lng}
                        originLabel={providerName}
                        height="450px"
                    />
                </div>

                <div className="modal-footer">
                    <div className="route-info-hint">
                        <span>💡 Open in Google Maps for real-time turn-by-turn navigation.</span>
                    </div>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}
