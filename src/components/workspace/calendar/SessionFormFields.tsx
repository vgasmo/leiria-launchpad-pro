import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Users } from 'lucide-react';

interface MemberEmail {
  email: string;
  name: string;
  avatar?: string | null;
  role: string;
}

interface SessionFormData {
  title: string;
  agenda: string;
  date: string;
  startTime: string;
  duration: string;
  location: string;
  joinUrl: string;
  sendInvites: boolean;
  inviteEmails: string;
  sessionType: string;
}

interface SessionFormFieldsProps {
  isEdit: boolean;
  formData: SessionFormData;
  setFormData: React.Dispatch<React.SetStateAction<SessionFormData>>;
  sessionTemplates?: Array<{ id: string; name: string; agenda_template?: string | null }>;
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  memberEmails: MemberEmail[];
}

export function SessionFormFields({
  isEdit,
  formData,
  setFormData,
  sessionTemplates,
  selectedTemplate,
  onTemplateSelect,
  memberEmails,
}: SessionFormFieldsProps) {
  const { t } = useTranslation();

  const renderInviteRecipients = (
    emailsValue: string,
    setEmails: (val: string) => void,
    inputId: string
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{t('sessions.recipientEmails', { defaultValue: 'Emails dos destinatários' })}</Label>
      
      {memberEmails.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{t('sessions.quickAddMembers', { defaultValue: 'Adicionar membros rapidamente:' })}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const allEmails = memberEmails.map(m => m.email).join(', ');
                setEmails(emailsValue ? `${emailsValue}, ${allEmails}` : allEmails);
              }}
            >
              <Users className="h-3 w-3 mr-1" />
              {t('sessions.addAll', { defaultValue: 'Adicionar todos ({{count}})', count: memberEmails.length })}
            </Button>
            {memberEmails.slice(0, 5).map((member) => (
              <Button
                key={member.email}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const currentEmails = emailsValue
                    .split(/[,;\n]/)
                    .map(e => e.trim())
                    .filter(Boolean);
                  
                  if (!currentEmails.includes(member.email)) {
                    setEmails(emailsValue ? `${emailsValue}, ${member.email}` : member.email);
                  }
                }}
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage src={member.avatar || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {member.name.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <Textarea
        id={inputId}
        value={emailsValue}
        onChange={(e) => setEmails(e.target.value)}
        placeholder={t('sessions.enterEmails', { defaultValue: 'Introduza emails (separados por vírgulas ou linhas)' })}
        rows={2}
      />
      <p className="text-xs text-muted-foreground">
        {t('sessions.icsNote', { defaultValue: 'Os destinatários receberão um email com um anexo .ics para o calendário' })}
      </p>
    </div>
  );

  return (
    <div className="grid gap-4 py-4">
      {!isEdit && sessionTemplates && sessionTemplates.length > 0 && (
        <div className="grid gap-2">
          <Label>{t('sessions.useTemplate', { defaultValue: 'Usar template (opcional)' })}</Label>
          <Select value={selectedTemplate} onValueChange={onTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder={t('sessions.selectTemplate', { defaultValue: 'Selecionar template...' })} />
            </SelectTrigger>
            <SelectContent>
              {sessionTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-title" : "title"}>{t('sessions.titleLabel', { defaultValue: 'Título' })} *</Label>
        <Input
          id={isEdit ? "edit-title" : "title"}
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={t('sessions.titlePlaceholder', { defaultValue: 'Título da sessão' })}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t('sessions.sessionTypeLabel', { defaultValue: 'Tipo de Sessão' })}</Label>
        <Select value={formData.sessionType} onValueChange={(v) => setFormData((prev) => ({ ...prev, sessionType: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">{t('sessions.types.general', { defaultValue: 'Geral' })}</SelectItem>
            <SelectItem value="discovery">{t('sessions.types.discovery', { defaultValue: 'Discovery' })}</SelectItem>
            <SelectItem value="problem_solving">{t('sessions.types.problemSolving', { defaultValue: 'Problem-Solving' })}</SelectItem>
            <SelectItem value="mentoring">{t('sessions.types.mentoring', { defaultValue: 'Mentoria' })}</SelectItem>
            <SelectItem value="check_in">{t('sessions.types.checkIn', { defaultValue: 'Check-in' })}</SelectItem>
            <SelectItem value="pitch_practice">{t('sessions.types.pitchPractice', { defaultValue: 'Pitch Practice' })}</SelectItem>
            <SelectItem value="workshop">{t('sessions.types.workshop', { defaultValue: 'Workshop' })}</SelectItem>
            <SelectItem value="follow_up">{t('sessions.types.followUp', { defaultValue: 'Follow-up' })}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-agenda" : "agenda"}>{t('sessions.agendaLabel', { defaultValue: 'Agenda' })}</Label>
        <Textarea
          id={isEdit ? "edit-agenda" : "agenda"}
          value={formData.agenda}
          onChange={(e) => setFormData((prev) => ({ ...prev, agenda: e.target.value }))}
          placeholder={t('sessions.agendaPlaceholder', { defaultValue: 'Temas a discutir' })}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="grid gap-2">
          <Label htmlFor={isEdit ? "edit-date" : "date"}>{t('sessions.dateLabel', { defaultValue: 'Data' })} *</Label>
          <Input
            id={isEdit ? "edit-date" : "date"}
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={isEdit ? "edit-startTime" : "startTime"}>{t('sessions.startLabel', { defaultValue: 'Início' })} *</Label>
          <Input
            id={isEdit ? "edit-startTime" : "startTime"}
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={isEdit ? "edit-duration" : "duration"}>{t('sessions.durationLabel', { defaultValue: 'Duração' })}</Label>
          <Select value={formData.duration} onValueChange={(v) => setFormData((prev) => ({ ...prev, duration: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="45">45 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
              <SelectItem value="90">90 min</SelectItem>
              <SelectItem value="120">120 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-location" : "location"}>{t('sessions.locationLabel', { defaultValue: 'Local' })}</Label>
        <Input
          id={isEdit ? "edit-location" : "location"}
          value={formData.location}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          placeholder={t('sessions.locationPlaceholder', { defaultValue: 'Sala de reunião ou endereço' })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-joinUrl" : "joinUrl"}>{t('sessions.meetingLinkLabel', { defaultValue: 'Link da reunião' })}</Label>
        <Input
          id={isEdit ? "edit-joinUrl" : "joinUrl"}
          value={formData.joinUrl}
          onChange={(e) => setFormData((prev) => ({ ...prev, joinUrl: e.target.value }))}
          placeholder="https://meet.google.com/..."
        />
      </div>
      
      {!isEdit && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvites"
              checked={formData.sendInvites}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sendInvites: checked === true }))}
            />
            <Label htmlFor="sendInvites" className="flex items-center gap-2 cursor-pointer">
              <Mail className="h-4 w-4" />
              {t('sessions.sendCalendarInvites', { defaultValue: 'Enviar convites de calendário por email' })}
            </Label>
          </div>
          
          {formData.sendInvites && renderInviteRecipients(
            formData.inviteEmails,
            (val) => setFormData((prev) => ({ ...prev, inviteEmails: val })),
            'inviteEmails'
          )}
        </div>
      )}
    </div>
  );
}

export type { SessionFormData, MemberEmail };
