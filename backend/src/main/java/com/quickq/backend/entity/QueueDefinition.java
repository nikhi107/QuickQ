package com.quickq.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "queues")
public class QueueDefinition {

    @Id
    @Column(name = "queue_id", nullable = false, unique = true)
    private String queueId;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "admin_subtitle", nullable = false)
    private String adminSubtitle;

    @Column(name = "client_description", nullable = false)
    private String clientDescription;

    @Column(name = "counter_label", nullable = false)
    private String counterLabel;

    @Column(name = "accent_from", nullable = false)
    private String accentFrom;

    @Column(name = "accent_to", nullable = false)
    private String accentTo;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    public String getQueueId() {
        return queueId;
    }

    public void setQueueId(String queueId) {
        this.queueId = queueId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAdminSubtitle() {
        return adminSubtitle;
    }

    public void setAdminSubtitle(String adminSubtitle) {
        this.adminSubtitle = adminSubtitle;
    }

    public String getClientDescription() {
        return clientDescription;
    }

    public void setClientDescription(String clientDescription) {
        this.clientDescription = clientDescription;
    }

    public String getCounterLabel() {
        return counterLabel;
    }

    public void setCounterLabel(String counterLabel) {
        this.counterLabel = counterLabel;
    }

    public String getAccentFrom() {
        return accentFrom;
    }

    public void setAccentFrom(String accentFrom) {
        this.accentFrom = accentFrom;
    }

    public String getAccentTo() {
        return accentTo;
    }

    public void setAccentTo(String accentTo) {
        this.accentTo = accentTo;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
